import { parseImage } from './helpers'

export const Heading = ({ json }) => {
  const { tagName: size, children: headingChildren } = json.find(el => el.type === 'element' && el.tagName.includes('h'))
  const [text] = headingChildren.map(({}))
  return {
    type: 'Heading',
    fields: {
      text,
      size
    }
  }
}

export const Paragraph = ({ innerHTML }) => ({ type: 'Paragraph', fields: { content: innerHTML } })

export const Image = async ({ json }, { wp, https }) => {
  try {
    const image = await parseImage(json, { wp, https })
    return {
      type: 'Image',
      fields: { image }
    }
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

  return {
    type: 'Gallery',
    fields: { images }
  }
}

export const List = async ({ json }) => {
  const { children: listChildren } = json.find(el => el.tagName === 'ul')
  const items = listChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'List',
    fields: { items }
  }
}

export const Quote = async ({ json }) => {
  const { children: quoteChildren } = json.find(el => el.tagName === 'blockquote')
  const [text, citation] = quoteChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'Quote',
    fields: {
      text,
      citation
    }
  }
}

export const Audio = async ({ json }) => {
  const { children: audioChildren } = json.find(el => el.tagName === 'figure')
  const [sourceUrl, caption] = audioChildren.map(el => {
    if (el.tagName === 'audio') {
      const { value: sourceUrl } = el.attributes.find(({ key }) => key === 'src')
      return sourceUrl
    }
    if (el.tagName === 'figcaption') {
      const [text] = el.children
      return text.content
    }
  })
  return {
    type: 'Audio',
    fields: {
      sourceUrl,
      caption
    }
  }
}
