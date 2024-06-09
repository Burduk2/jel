# Jel Templating Engine

```bash
npm install jel-framework
```

- **NOTE:** set JS in language mode for .jel files in your editor to see syntax highlighting.

### Jel exports one function
It turns your .jel template to an HTML string, that you can later serve on your HTTP server.

```js
const jel = require('jel-framework');

const htmlString = jel('/path/to/my/template.jel');

res.send(htmlString);
```

### Jel Syntax

- General example:
```js
{$anyHTMLElement}{
    function justSomeRegularJS() {...}

    {$otherHTMLElement`some[attribute]`}{
        // more JS or HTML elements
    }
    
    // you can use () after {} to directly write innerHTML of an element 
    {$elementWithSetInnerHTML}('innerHTML of an element here');
}
```

- Real-world example:
```js
{$div`.main-container`}{
    {$h1`.title data-heading[1]`}('Hello World!');
    {$p}{
        runSomeOfMyJS();

        // {$} simply adds raw html. NOTE: you must use only () after {$}
        {$}('Lorem ipsum dolor sit amet.');
    }
}
```

The previous Jel code will produce the following string (here unminified):
```html
<!DOCTYPE html>
<html>
<head>

</head>
<body>
    <div class="main-container">
        <h1 class="title" data-heading="1">Hello World!</h1>
        <p>Lorem ipsum dolor sit amet.</p>
    </div>
</body>
</html>
```

That's good, but how do i add elements to &lt;head>?

### Other template-only functions

#### addToHead() - add elements to &lt;head>
Declaration:

```ts
Jel.addToHead(tag: String, innerContent: String): void
```

Example usage:

```js
Jel.addToHead('style', 'body { background-color: black }');
Jel.addToHead('script src[/my/js/file.js]');
```

##### Special tag names built into Jel
```js
// <meta charset="UTF-8">
Jel.addToHead('meta:utf8');

// <meta name="viewport" content="width=device-width initial-scale=1.0">
Jel.addToHead('meta:viewport');

// <link rel="stylesheet" href="/path/to/style.css">
Jel.addToHead('link:css href[/path/to/style.css]');

// <link rel="shortcut icon" href="/path/to/favicon.ico" type="image/x-icon">
Jel.addToHead('link:fav href[/path/to/favicon.ico] type[image/x-icon]');
```

#### setDocumentAttribute() - set attributes of &lt;html>
Declaraion:
```ts
Jel.setDocumentAttribute(name: String, value: String): void
```

#### clientJS() - add JS that will run on clientside

Declaraion:
```ts
Jel.clientJS(attributes: String, code: Function): void
```

Real-world example usage:
```js
const variableFromBackend = '123';

Jel.clientJS('defer integrity[...]', () => {
    document.querySelector('.my-element').setAttribute(variableFromBackend)
});
```