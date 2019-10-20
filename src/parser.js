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
    return
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
    const blockHandler = blockCategories[ category ][ block ]
    if (!blockHandler) {
      console.error('No handler for this block type:', category, block)
      return
    }
    const parsedBlock = await blockHandler(blockContent, options)
    return parsedBlock
  } catch (error) {
    throw new Error(error.message)
  }
}

export default parseBlock
