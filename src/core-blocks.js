import { parseImage } from './helpers'

export const Heading = ({ json }) => {
  const { tagName: size, children: [text] } = json.find(el => el.type === 'element' && el.tagName.includes('h'))
  return {
    type: 'Heading',
    size,
    content: text.content
  }
}

export const Paragraph = ({ innerHTML }) => ({ type: 'Paragraph', content: innerHTML })

export const Image = async ({ json }, { wp, https }) => {
  try {
    const image = await parseImage(json, { wp, https })
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
      const image = await parseImage(imageEl.children, { wp, https })
      images.push(image)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  return { type: 'Gallery', images }
}

export const List = async ({ json }) => {
  const { children: listChildren } = json.find(el => el.tagName === 'ul')
  const items = listChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'List',
    items
  }
}

export const Quote = async ({ json }) => {
  const { children: QuoteChildren } = json.find(el => el.tagName === 'blockquote')
  const [text, citation] = QuoteChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'Quote',
    text,
    citation
  }
}
