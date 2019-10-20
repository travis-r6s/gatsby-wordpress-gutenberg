const { parse } = require('himalaya')
const nanoid = require('nanoid')
const axios = require('axios')
const { createRemoteFileNode } = require('gatsby-source-filesystem')

const wp = axios.create({
  baseURL: 'http://127.0.0.1:32865/wp-json/wp/v2/media/'
})

export const onCreateNode = async ({ node, actions, createNodeId, createContentDigest, store, cache }) => {
  const { createNode, createNodeField } = actions

  // Helpers
  const processBlock = block => {
    const nodeId = createNodeId(`gutenberg-block-${nanoid(6)}`)
    const nodeContent = JSON.stringify(block.content)

    return {
      ...block,
      id: nodeId,
      parent: node.id,
      children: [],
      internal: {
        type: `GutenbergBlock${block.type}`,
        content: nodeContent,
        contentDigest: createContentDigest(block)
      }
    }
  }

  const transformImage = async (image, node) => {
    let fileNode
    try {
      fileNode = await createRemoteFileNode({
        url: image.sourceUrl,
        parentNodeId: node.id,
        store,
        cache,
        createNode,
        createNodeId
      })
    } catch (error) {
      throw new Error(error.message)
    }
    return fileNode
  }

  // Types to transform
  const typesToTransform = ['wordpress__POST', 'wordpress__PAGE']

  // Start Transforms
  if (typesToTransform.includes(node.internal.type)) {
    // Normalize blocks
    const allParsedBlocks = []
    for (const block of node.blocks) {
      const parsedBlock = await parseBlock({ block, node })
      if (parsedBlock) allParsedBlocks.push(parsedBlock)
    }

    // Create Nodes for each block, and any images if relevant.
    const allBlockNodeIds = []

    for await (const block of allParsedBlocks) {
      const nodeData = processBlock(block)
      // If we have an image, create a remote file node.
      if (block.type === 'Image') {
        const fileNode = await transformImage(block.image, nodeData)
        if (fileNode) nodeData.image.localFile___NODE = fileNode.id
      }
      if (block.type === 'Gallery') {
        const images = []
        for await (const image of block.images) {
          const fileNode = await transformImage(image, nodeData)
          if (fileNode) images.push({ ...image, localFile___NODE: fileNode.id })
        }
        nodeData.images = images
      }
      // Create the Node
      await createNode(nodeData)
      // Push the Node ID to the array to use in parent block
      allBlockNodeIds.push(nodeData.id)
    }

    createNodeField({
      node,
      name: 'blocks___NODE',
      value: allBlockNodeIds
    })
  }
}

// Replace Image HTML with Object containing ID and original URL
async function replaceImage (json) {
  // Find the first img element
  const figure = json.find(el => el.tagName === 'figure')
  const image = figure.children.find(child => child.tagName === 'img')

  // Get the value of the class attr that contains the image ID, and trim it to get only the ID
  const { value } = image.attributes.find(attr => attr.value.includes('wp-image-'))
  const id = value.replace('wp-image-', '')

  try {
    // Now fetch the original URL from the API
    const { data: { source_url } } = await wp.get(id)

    // Return data
    return {
      imageId: id,
      // In dev, where httpS is self signed, we need to use http
      sourceUrl: source_url.replace('https', 'http')
    }
  } catch (error) {
    throw new Error(error.response.data)
  }
}

// Parse a block to turn it into consistent data object
async function parseBlock ({ block: blockContent, node: { title } }) {
  const { blockName, innerHTML } = blockContent

  // Check we have HTML, and parse to JSON
  if (!innerHTML) return
  const json = parse(innerHTML)

  // Switch through blocks, returning each respective type
  if (!blockName) return { type: 'Break', content: '<br/>' }
  if (blockName === 'core/paragraph') return { type: 'Paragraph', content: innerHTML }
  if (blockName === 'core/image') {
    const image = await replaceImage(json)
    return { type: 'Image', image }
  }
  if (blockName === 'core/gallery') {
    // We have many images - find the ul element, which contains a list of all the images
    const { children: imagesElements } = json.find(el => el.tagName === 'ul')

    const images = []
    // Now we can loop through that list, replacing images as usual, and pushing to an array
    for await (const imageEl of imagesElements) {
      const image = await replaceImage(imageEl.children)
      images.push(image)
    }

    return { type: 'Gallery', images }
  }

  if (blockName === 'core/shortcode') {
    console.error(`Page '${title}' contains a shortcode block, which will be ignored.`)
    return null
  }

  // Nothing? Whoops.
  return {
    type: '404',
    content: innerHTML
  }
}
