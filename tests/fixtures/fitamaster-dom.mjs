export class Element{
 constructor(tagName='#text',text=''){this.tagName=tagName;this.text=text;this.children=[];this.attributes={};this.events={};}
 set innerHTML(value){throw new Error('HTML insertion is forbidden');}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text+this.children.map(child=>child.textContent).join('');}
 setAttribute(name,value){this.attributes[name]=String(value);}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;this.text='';}
 addEventListener(name,handler){this.events[name]=handler;}
}
export const document={createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text)};
export const nodes=root=>[root,...root.children.flatMap(nodes)];
export const tags=(root,tag)=>nodes(root).filter(node=>node.tagName===tag);
export const button=(root,label)=>tags(root,'button').find(node=>node.textContent===label);
export const click=node=>{if(!node)throw new Error('Expected control exists');return node.events.click({currentTarget:node});};
