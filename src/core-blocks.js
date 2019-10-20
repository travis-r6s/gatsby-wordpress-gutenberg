import { parseImage } from './helpers'

export const Heading = ({ json }) => {
  const { tagName: size, children: headingChildren } = json.find(el => el.type === 'element' && el.tagName.includes('h'))
  const [text] = headingChildren.map(({}))
  return {
    type: 'Heading',
    content: {
      text,
      size
    }
  }
}

export const Paragraph = ({ innerHTML }) => ({ type: 'Paragraph', content: { html: innerHTML } })

export const Image = async ({ json }, { wp, https }) => {
  try {
    const image = await parseImage(json, { wp, https })
    return {
      type: 'Image',
      content: { image }
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
    content: { images }
  }
}

export const List = ({ json }) => {
  const { children: listChildren } = json.find(el => el.tagName === 'ul')
  const items = listChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'List',
    content: { items }
  }
}

export const Quote = ({ json }) => {
  const { children: quoteChildren } = json.find(el => el.tagName === 'blockquote')
  const [text, citation] = quoteChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'Quote',
    content: {
      text,
      citation
    }
  }
}

export const Cover = ({ json, innerBlocksJson }) => {
  const { attributes: coverAttributes } = json.find(el => el.tagName === 'div')
  const { value: backgroundAttribute } = coverAttributes.find(({ key }) => key === 'style')
  const backgroundSourceUrl = backgroundAttribute.replace('background-image:url(', '').slice(0, -1).replace('https://', '').replace('http://', '')

  const [paragraphBlock] = innerBlocksJson
  const { children: [text] } = paragraphBlock.json.find(el => el.tagName === 'p')

  return {
    type: 'Cover',
    content: {
      backgroundImage: backgroundSourceUrl,
      text: text.content
    }
  }
}

export const Audio = ({ json }) => {
  const { children: audioChildren } = json.find(el => el.tagName === 'figure')
  const [sourceUrl, caption] = audioChildren.map(el => {
    if (el.tagName === 'audio') {
      const { value: sourceUrl } = el.attributes.find(({ key }) => key === 'src')
      return sourceUrl.replace('https://', '').replace('http://', '')
    }
    if (el.tagName === 'figcaption') {
      const [text] = el.children
      return text.content
    }
  })
  return {
    type: 'Audio',
    content: {
      sourceUrl,
      caption
    }
  }
}
