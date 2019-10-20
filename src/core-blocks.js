import { replaceImage } from './helpers'

export const Paragraph = ({ innerHTML }) => ({ type: 'Paragraph', content: innerHTML })

export const Image = async ({ json }, { wp, https }) => {
  try {
    const image = await replaceImage(json, { wp, https })
    return { type: 'Image', image }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const Gallery = async ({ json }, { wp, https }) => {
  const { children: imagesElements } = json.find(el => el.tagName === 'ul')

  const images = []
  // Now we can loop through that list, replacing images as usual, and pushing to an array
  for await (const imageEl of imagesElements) {
    try {
      const image = await replaceImage(imageEl.children, { wp, https })
      images.push(image)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  return { type: 'Gallery', images }
}
