import axios from 'axios'

import { processBlock, transformFile } from './helpers'
import parseBlock from './parser'

export const onCreateNode = async ({ node, actions, createNodeId, createContentDigest, store, cache }, options) => {
  const { createNode, createNodeField } = actions
  const { baseUrl, https = true, includedTypes = ['wordpress__POST', 'wordpress__PAGE'], excludedBlocks = [] } = options

  if (!baseUrl) throw new Error('You must include the Base URL')

  const wp = axios.create({
    baseURL: `${https ? 'https' : 'http'}${baseUrl}/wp-json/wp/v2/media/`
  })

  if (includedTypes.includes(node.internal.type)) {
    // Normalize blocks
    const allParsedBlocks = []
    for (const block of node.blocks) {
      try {
        const parsedBlock = await parseBlock(block, { node, wp, https, excludedBlocks })
        if (parsedBlock) allParsedBlocks.push(parsedBlock)
      } catch (error) {
        throw new Error(error.message)
      }
    }

    // Create Nodes for each block, and any images if relevant.
    const allBlockNodeIds = []

    for await (const block of allParsedBlocks) {
      const nodeData = processBlock(block, { node, createNodeId, createContentDigest })
      // If we have an image, create a remote file node.
      if (block.type === 'Image') {
        try {
          const sourceUrl = block.fields.image.sourceUrl
          const fileNode = await transformFile(sourceUrl, { nodeData, store, cache, createNode, createNodeId })
          if (fileNode) nodeData.fields.image.localFile___NODE = fileNode.id
        } catch (error) {
          throw new Error(error.message)
        }
      }
      if (block.type === 'Gallery') {
        const images = []
        for await (const image of block.fields.images) {
          try {
            const sourceUrl = image.sourceUrl
            const fileNode = await transformFile(sourceUrl, { nodeData, store, cache, createNode, createNodeId })
            if (fileNode) images.push({ ...image, localFile___NODE: fileNode.id })
          } catch (error) {
            throw new Error(error.message)
          }
        }
        nodeData.fields.images = images
      }

      // Delete the JSON field
      delete nodeData.json
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
