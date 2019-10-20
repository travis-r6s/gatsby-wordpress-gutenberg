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
export const parseImage = async (json, { wp, https }) => {
  // Find the first img element
  const figure = json.find(el => el.tagName === 'figure')
  const image = figure.children.find(child => child.tagName === 'img')
  const caption = figure.children.find(child => child.tagName === 'figcaption')

  // Get the value of the class attr that contains the image ID, and trim it to get only the ID
  const { value } = image.attributes.find(attr => attr.value.includes('wp-image-'))
  const id = value.replace('wp-image-', '')

  try {
    // Now fetch the original URL from the API
    const { source_url, alt_text, title } = await wp.get(id).then(({ data }) => data).catch(e => { throw new Error(e) })

    return {
      caption,
      imageId: id,
      altText: alt_text,
      title: title.rendered,
      // In dev, where httpS is self signed, we need to use http
      sourceUrl: https ? source_url : source_url.replace('https', 'http')
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const transformFile = async (url, { nodeData, store, cache, createNode, createNodeId }) => {
  let fileNode
  try {
    fileNode = await createRemoteFileNode({
      url,
      parentNodeId: nodeData.id,
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
