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
        let newExpression = match.match.slice(1, -1)
        
        if (newExpression.charAt(newExpression.length - 1) === ']') {
            let attrs = [];
            const initialStart = newExpression.indexOf('[');
            const tag = newExpression.slice(1, initialStart);

            addAttr(initialStart, findClosingBrace('[]', newExpression, initialStart) + 1);
            function addAttr(start, end) {
                attrs.push(newExpression.slice(start + 1, end - 1));

                if (newExpression.charAt(end) === '[') {
                    newStart = end;
                    newEnd = findClosingBrace('[]', newExpression, newStart) + 1;
                    addAttr(newStart, newEnd);
                } 
            }
            newExpression = `"${tag}",[${attrs.toString()}]`;
        } else {
            newExpression = `"${newExpression.slice(1)}",""`;
        }
        
        newExpression = 'Jel.addElement(__$jelElementPlace,' + newExpression + ');'
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
    const nums = '0123456789';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const cyrillic = 'АБВГДЕЁЖЗІЇИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзіїийклмнопрстуфхцчшщъыьэюя';
    const greek = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω';
    const chars = nums + latin + cyrillic + greek;
    for (let i = 0; i < 4; i++) {
        uid += chars[Math.floor(Math.random() * chars.length)]
    }
    return uid;
}
function setAttrs(element, attrs) {
    if (!attrs) return element;

    attrs.forEach(attr => {
        const splitIndex = attr.indexOf('=');
        if (splitIndex === -1) {
            element.setAttribute(attr, '');
            return;
        }
        const name = attr.substring(0, splitIndex);
        const value = attr.substring(splitIndex).slice(1); 
        element.setAttribute(name, value);
    });

    return element;
}
function evalJelCode(code) {
    let __$jelOutputHtmlString = '<!DOCTYPE html>';
    let __$jelElementPlace = 'body';
    
    class Jel {
        static setAttribute(selector, name, value='') {
            const dom = new JSDOM(__$jelOutputHtmlString);
            const document = dom.window.document;
            document.querySelector(selector).setAttribute(name, value);
            __$jelOutputHtmlString = dom.serialize();
        }
        static addToHead(element, content='') {
            const spaceIndex = element.indexOf(' ');
            let tagPart = element;
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

            this.addElement('head', tag, attrs, content);
        }
        static addElement(place, tag, attrs, content='') {
            if (!attrs) attrs = [];
            const dom = new JSDOM(__$jelOutputHtmlString);
            const document = dom.window.document;
            const jelUidAttrName = '_jid';
    
            let element;
            let uid = getElementUid();
            while (document.querySelector(`[${jelUidAttrName}="${uid}"]`)) uid = getElementUid();
    
            if (tag) {
                if (tag.includes(':')) {
                    let tagPart = tag.split(':');
                    tag = tagPart[0];
                    const special = tagPart[1];
                    if (tag === 'meta') {
                        if (special === 'utf8') 
                            attrs.push('charset=UTF-8');
                        else if (special === 'viewport')
                            attrs.push('name=viewport', 'content=width=device-width initial-scale=1.0');
                    } else if (tag === 'link') {
                        if (special === 'css') 
                            attrs.push('rel=stylesheet');
                        else if (special === 'fav' || special === 'favicon') 
                            attrs.push('rel=shortcut icon');
                    }
                }
                element = document.createElement(tag);
                if (content && typeof content !== 'function') element.innerHTML = content;
                element = setAttrs(element, attrs);
                element.setAttribute(jelUidAttrName, uid);
                document.querySelector(place).appendChild(element);
            } else if (typeof content !== 'function') {
                document.querySelector(place).innerHTML += content;
            }
            
            __$jelOutputHtmlString = dom.serialize();
            if (typeof content === 'function') {
                const selector = tag === 'head' ? 'head' : tag === 'body' ? 'body' 
                    : `[${jelUidAttrName}="${uid}"]`
                content(selector);
            } 
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