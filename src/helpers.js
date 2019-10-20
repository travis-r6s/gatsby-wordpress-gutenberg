import nanoid from 'nanoid'
import { createRemoteFileNode } from 'gatsby-source-filesystem'

export const processBlock = (block, { node, createNodeId, createContentDigest }) => {
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

// Replace Image HTML with Object containing ID and original URL
export const replaceImage = async (json, { wp, https }) => {
  // Find the first img element
  const figure = json.find(el => el.tagName === 'figure')
  const image = figure.children.find(child => child.tagName === 'img')

  // Get the value of the class attr that contains the image ID, and trim it to get only the ID
  const { value } = image.attributes.find(attr => attr.value.includes('wp-image-'))
  const id = value.replace('wp-image-', '')

  try {
    // Now fetch the original URL from the API
    const { data: { source_url } } = await wp.get(id)

    return {
      imageId: id,
      // In dev, where httpS is self signed, we need to use http
      sourceUrl: https ? source_url : source_url.replace('https', 'http')
    }
  } catch (error) {
    throw new Error(error.response.data)
  }
}

export const transformImage = async (image, { node, store, cache, createNode, createNodeId }) => {
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
