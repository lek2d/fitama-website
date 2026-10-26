function combinationCount(catalog) {
  if(!catalog?.groups?.length||catalog.groups.some(group=>!group.options?.length))throw new Error('Pet trait catalog is empty');
  const count=catalog.groups.reduce((total,group)=>total*group.options.length,1);
  if(!Number.isSafeInteger(count))throw new Error('Pet trait catalog is too large');
  return count;
}

export function composeAppearance(base,catalog,index) {
  const count=combinationCount(catalog);
  if(!Number.isInteger(index)||index<0||index>=count)throw new Error('Pet trait choice is out of range');
  const images=new Map(base.images.map(image=>[image.property,{...image}]));
  const numbers={...base.numbers},traits={};
  let remaining=index;
  for(const group of catalog.groups){
    const option=group.options[remaining%group.options.length];
    remaining=Math.floor(remaining/group.options.length);
    for(const image of option.images){
      if(!images.has(image.property))throw new Error(`Pet trait has no image slot: ${image.property}`);
      images.set(image.property,{...image});
    }
    Object.assign(numbers,option.numbers);Object.assign(traits,option.traits);
  }
  numbers.sleeping=0;numbers.ambientActivity=0;
  return {...base,images:[...images.values()],numbers,traits,choice:{petId:base.id,index,key:`${base.id}:${index}`}};
}

export function chooseAppearance(base,catalog,previous,random=Math.random) {
  const count=combinationCount(catalog);
  const excluded=previous?.petId===base.id&&Number.isInteger(previous.index)&&previous.index>=0&&previous.index<count&&count>1?previous.index:null;
  const roll=random();
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Pet trait random value is invalid');
  let index=Math.floor(roll*(count-(excluded===null?0:1)));
  if(excluded!==null&&index>=excluded)index++;
  return composeAppearance(base,catalog,index);
}
