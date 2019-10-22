# gatsby-wordpress-gutenberg

> Gutenberg Blocks plugin for gatsby-plugin-wordpress

This is an *experimental* plugin (I.e. not production-ready 😏) that takes blocks from Gutenberg, and transforms them to an array of blocks that tell you the block type, and the inside content (in most cases *without* the html).

## Installation

This plugin works in conjunction with `gatsby-plugin-wordpress`, so you will need to add and configure that first. You will then need to add the below code to your Wordpress themes `functions.php`:

```php
add_action(
	'rest_api_init',
	function () {

		if ( ! function_exists( 'use_block_editor_for_post_type' ) ) {
			require ABSPATH . 'wp-admin/includes/post.php';
		}

		// Surface all Gutenberg blocks in the WordPress REST API
		$post_types = get_post_types_by_support( [ 'editor' ] );
		foreach ( $post_types as $post_type ) {
			if ( use_block_editor_for_post_type( $post_type ) ) {
				register_rest_field(
					$post_type,
					'blocks',
					[
						'get_callback' => function ( array $post ) {
							return parse_blocks( $post['content']['raw'] );
						},
					]
				);
			}
		}
	}
);
```

Now you can add this plugin.

`gatsby-config.js`
```javascript
...
{
      resolve: `gatsby-wordpress-gutenberg`,
      options: {
        baseUrl: <url>, // Your Wordpress URL, without the protocol - required
        https: true, // optional, default: true
        includedTypes: ['wordpress__POST', 'wordpress__PAGE'], // Nodes that contain Gutenberg blocks to transform - optional
        excludedBlocks: [], // Blocks to exclude - optional
      }
},
...
```

## Usage

For each type that you chose to transform, a `fields/blocks` field will appear, which is a union field - here you can select blocks to query.
Your data will then contain an array of objects, containing the fields you selected, in the order created in the post/page etc.
You can create components for each type, and use that component within a loop if it matches the current type. For example:

```javascript
const ParagraphBlock = ({ html }) => (<div className="content" dangerouslySetInnerHTML={html} />)
...
return (
  <Layout>
    {data.wordpressPost.fields.blocks.map(block => (
      <div key={block.id}>
        {block.type === 'Paragraph' && <ParagraphBlock html={block.content.html} />}
        {block.type === 'Image' && <Img fluid={block.content.image.localFile.childImageSharp.fluid} alt={block.content.image.altText} />}
        ...etc
      </div>
    ))
  </Layout>
)
...
```

Try visiting the Graphiql explorer to see how this works - some examples are below.

## Examples

#### Paragraph
```graphql
query Posts {
  allWordpressPost {
    nodes {
      fields {
        blocks {
          ... on GutenbergBlockParagraph {
            id
            type
            content {
              html
            }
          }
        }
      }
    }
  }
}
```

### Heading

```graphql
query Posts {
  allWordpressPost {
    nodes {
      fields {
        blocks {
          ... on GutenbergBlockHeading {
            id
            type
            content {
              text
              size
            }
          }
        }
      }
    }
  }
}

```

### Images

Images are downloaded and processed using `gatsby-source-filesystem`. Each `image` field will have a `localFile` object inside it.

```graphql
query Posts {
  allWordpressPost {
    nodes {
      fields {
        blocks {
          ... on GutenbergBlockImage {
            id
            type
            content {
              image {
                title
                altText
                caption
                localFile {
                  childImageSharp {
                    fluid {
                      ...GatsbyImageSharpFluid
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

```

And other media types such as `Gallery`, `Audio`, `Video`, `File`, and `MediaText` also have this.
