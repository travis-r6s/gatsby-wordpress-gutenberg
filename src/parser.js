import { parse } from 'himalaya'

import * as CoreBlocks from './core-blocks'

// Parse a block to turn it into consistent data object
const parseBlock = async (blockContent, options) => {
  const { blockName, innerHTML, innerBlocks } = blockContent
  const { node } = options
  // Check we have HTML, and parse to JSON
  if (!innerHTML) return
  blockContent.json = parse(innerHTML)
  if (innerBlocks) {
    blockContent.innerBlocksJson = innerBlocks.map(block => {
      const json = parse(block.innerHTML)
      return {
        ...block,
        json
      }
    })
  }

  // A few quick checks, for blacklisted blocks etc
  if (!blockName) return { type: 'Break', content: { html: '<br/>' } }
  if (blockName === 'core/shortcode') {
    console.error(`Page '${node.title}' contains a shortcode block, which will be ignored.`)
    return null
  }

  /*
  * Block Names have slugs - 'core/paragraph'
  * We want to split this slug into two parts (category, and block), and then find the corresponding keys in an object.
  * So we have something like { Core: { Paragraph ()..., Gallery ()... } }
 */
  const blockCategories = { Core: CoreBlocks }
  const [category, block] = blockName.split('/').map(v => {
    const [first, ...rest] = v.split('')
    return `${first.toUpperCase()}${rest.join('')}`
  })

  try {
    const parsedBlock = await blockCategories[ category ][ block ](blockContent, options)
    if (parsedBlock) return parseBlock
    else {
      return {
        type: '404',
        content: innerHTML
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export default parseBlock
