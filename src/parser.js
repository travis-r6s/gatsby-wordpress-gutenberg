import { parse } from 'himalaya'

import { replaceImage } from './helpers'

// Parse a block to turn it into consistent data object
const parseBlock = async (blockContent, { node, wp, https }) => {
  const { blockName, innerHTML } = blockContent

  // Check we have HTML, and parse to JSON
  if (!innerHTML) return
  const json = parse(innerHTML)

  // Switch through blocks, returning each respective type
  if (!blockName) return { type: 'Break', content: '<br/>' }
  if (blockName === 'core/paragraph') return { type: 'Paragraph', content: innerHTML }
  if (blockName === 'core/image') {
    const image = await replaceImage(json, { wp, https })
    return { type: 'Image', image }
  }
  if (blockName === 'core/gallery') {
    // We have many images - find the ul element, which contains a list of all the images
    const { children: imagesElements } = json.find(el => el.tagName === 'ul')

    const images = []
    // Now we can loop through that list, replacing images as usual, and pushing to an array
    for await (const imageEl of imagesElements) {
      const image = await replaceImage(imageEl.children, { wp, https })
      images.push(image)
    }

    return { type: 'Gallery', images }
  }

  if (blockName === 'core/shortcode') {
    console.error(`Page '${node.title}' contains a shortcode block, which will be ignored.`)
    return null
  }

  // Nothing? Whoops.
  return {
    type: '404',
    content: innerHTML
  }
}

export default parseBlock
