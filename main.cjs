const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

class PlaceholderS {
    static bind(where, str) {
        if (!Array.isArray(where)) where = [where];

        let pdzedStr = str;
        let pholders = [];

        where.forEach(regex => {
            pdzedStr = pdzedStr.replace(regex, match => {
                let pholderName = ''
                for (let i = 0; i < 32; i++) pholderName += '0123456789abcdef'[Math.floor(Math.random() * 15)];
                const pholder = `__PS${pholderName}__`;
                pholders.push({ name: pholder, value: match });
                return pholder;
            });
        });

        return [pholders, pdzedStr];
    }
    static unbind(placeholders, str) {
        placeholders.forEach(({ name, value }) => {
            str = str.replace(new RegExp(name, 'gm'), value);
        });

        return str;
    }
}
function replaceSubstr(str, start, end, replacement) {
    const before = str.slice(0, start);
    const after = str.slice(end + 1);
    return before + replacement + after;
}
function getMatchesAndIndexes(str, regex) {
    let match;
    const matches = [];

    while ((match = regex.exec(str)) !== null) {
        matches.push({
            match: match[0],
            start: match.index,
            end: match.index + match[0].length - 1
        });
    }
    return matches;
}
function findClosingBrace(brace, str, startIndex) {
    let count = 1; 
    let index = startIndex + 1;
    while (index < str.length) {
        const char = str[index];

        if (char === brace[0]) {
            count++;
        } else if (char === brace[1]) {
            count--; 
            if (count === 0) {
                return index;
            }
        }
        index++; 
    }
}
function formatFuncExpressions(code) {
    const matches = getMatchesAndIndexes(code, /\{\$[^}]*\}/gm);

    matches.reverse().forEach(match => {
        let newExpression = match.match.replace('{$', 'Jel.addElement(__$jelElementPlace,"');
        if (match.match.includes('__PS')) {
            newExpression = newExpression.replace('__PS', '",__PS');
            newExpression = newExpression.replace('}', ');');
        } else {
            newExpression = newExpression.replace('}', '","");')
        }
        code = replaceSubstr(code, match.start, match.end, newExpression);
    });
    return code;
}
function formatContentExpressions(code) {
    const matches = getMatchesAndIndexes(code, /Jel\.addElement\(/gm);

    matches.reverse().forEach(match => {
        const closingBraceIndex = findClosingBrace('()', code, match.end);
        const isContentExpression = code.slice(closingBraceIndex, closingBraceIndex + 3);
        if (isContentExpression !== ');{' && isContentExpression !== ');(') return;
        
        let closingContentBraceIndex, newExpression;
        if (isContentExpression === ');{') {
            closingContentBraceIndex = findClosingBrace('{}', code, closingBraceIndex + 3);
            
            newExpression = code.slice(closingBraceIndex, closingContentBraceIndex).trim();
            newExpression = newExpression.replace(');{', ',__$jelElementPlace=>{');
            newExpression += '});'
        } else if (isContentExpression === ');(') {
            closingContentBraceIndex = findClosingBrace('()', code, closingBraceIndex + 3);
            
            newExpression = code.slice(closingBraceIndex, closingContentBraceIndex).trim();
            newExpression = newExpression.replace(');(', ',');
            newExpression += ');';            
        }
        code = replaceSubstr(code, closingBraceIndex, closingContentBraceIndex, newExpression);
    });
    return code;
}

function getElementUid() {
    let uid = '';
    for (let i = 0; i < 32; i++) uid += '0123456789abcdef'[Math.floor(Math.random() * 15)];
    return uid;
}
function setAttrs(element, attrs) {
    if (!attrs) return element;

    const splitAttrs = attrs.match(/(?:[^\s\[\]]+|\[[^\]]*\])+/g);
    splitAttrs.forEach(attr => {
        if (attr.charAt(0) === '.') element.classList.add(attr.slice(1));
        else if (attr.charAt(0) === '#') element.id = attr.slice(1);
        else if (attr.includes('[')) {
            const index = attr.indexOf('[');
            const name = attr.substring(0, index);
            const value = attr.substring(index).slice(1).slice(0, -1);
            element.setAttribute(name, value);
        } else {
            element.setAttribute(attr, '')
        }
    });

    return element;
}
function evalJelCode(code) {
    let __$jelOutputHtmlString = '<!DOCTYPE html><html><head></head><body></body></html>';
    let __$jelElementPlace = 'body';

    class Jel {
        static _documentElementAttributes = [];
        static head = '';
        static setDocumentAttribute(name, value) {
            this._documentElementAttributes.push({name: name, value: value});
        }
        static addToHead(element, content='') {
            const closingElements = ['title', 'style', 'script', 'noscript'];

            const spaceIndex = element.indexOf(' ');
            let tagPart = element
            let attrs = '';
            if (spaceIndex > 0) {
                tagPart = element.substring(0, spaceIndex);
                attrs = element.substring(spaceIndex).trim();    
            }
            
            let tag;
            if (tagPart.includes(':')) {
                tag = tagPart.split(':')[0];
                const special = tagPart.split(':')[1];
                if (tag === 'meta') {
                    if (special === 'utf8') attrs += ' charset[UTF-8]';
                    else if (special === 'viewport')
                        attrs += ' name[viewport] content[width=device-width initial-scale=1.0]';
                } else if (tag === 'link') {
                    if (special === 'css') attrs += 'rel[stylesheet]';
                    else if (special === 'fav' || special === 'favicon') 
                        attrs += ' rel[shortcut icon]'
                }
            } else tag = tagPart;

            let parsedAttrs = ''
            if (attrs) {
                const splitAttrs = attrs.match(/(?:[^\s\[\]]+|\[[^\]]*\])+/g);
                splitAttrs.forEach(attr => {
                    if (attr.includes('[')) {
                        const index = attr.indexOf('[');
                        const name = attr.substring(0, index);
                        const value = attr.substring(index).slice(1).slice(0, -1);
                        parsedAttrs += ` ${name}="${value}"`;
                    } else {
                        parsedAttrs += attr;
                    }
                });
                parsedAttrs = parsedAttrs.trim();
            }

            let htmlElement = `<${tag} ${parsedAttrs}>`;
            closingElements.includes(tag) ? htmlElement += `${content}</${tag}>` : 0;
            this.head += htmlElement;
        }
        static addElement(place, tag, attrs, content='') {
            const dom = new JSDOM(__$jelOutputHtmlString);
            const document = dom.window.document;

            if (this._documentElementAttributes) {
                this._documentElementAttributes.forEach(attr => {
                    document.querySelector('html').setAttribute(attr.name, attr.value);
                });
                this._documentElementAttributes = [];
            } if (this.head) {
                document.querySelector('head').innerHTML += this.head;
                this.head = '';
            } 
    
            let element;
            let uid = getElementUid();
            while (document.querySelector(`[jel-element-uid="${uid}"]`)) uid = getElementUid();
    
            if (tag) {
                element = document.createElement(tag);
                if (content && typeof content !== 'function') element.innerHTML = content;
                element = setAttrs(element, attrs);
                element.setAttribute('jel-element-uid', uid);
                document.querySelector(place).appendChild(element);
            } else if (typeof content !== 'function') {
                document.querySelector(place).innerHTML += content;
            }
            
            __$jelOutputHtmlString = dom.serialize();
            if (typeof content === 'function') content(`[jel-element-uid="${uid}"]`);
        }
    }
    eval(code);
    return __$jelOutputHtmlString;
}

function jel(filePath) {
    const fileContent = fs.readFileSync(path.join(__dirname, filePath), 'utf8');

    let [ pholders, code ] = PlaceholderS.bind(/(["'`])(?:\\.|(?!\1)[^\\])*\1/gm, fileContent);
    code = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//gm, '');

    code = formatFuncExpressions(code);
    code = formatContentExpressions(code);
    code = PlaceholderS.unbind(pholders, code);
    code = evalJelCode(code);
    return code;
}

module.exports = jel;