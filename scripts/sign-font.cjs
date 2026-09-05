// Compile a local DM Sans subset once. Runtime text needs no font download or TTF parser.
const fs=require('node:fs'),path=require('node:path'),opentype=require('opentype.js');
const root=path.resolve(__dirname,'..'),bytes=fs.readFileSync(path.join(root,'src/assets/font-2.ttf'));
const font=opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const glyphs={},chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç$·?→-';
for(const ch of new Set(chars)){
 const glyph=font.charToGlyph(ch);
 if(glyph.index===0&&ch==='→'){glyphs[ch]={ha:1000,x_min:0,x_max:900,o:'m 0 260 l 560 260 l 560 460 l 900 160 l 560 -140 l 560 60 l 0 60 l 0 260'};continue;}
 if(glyph.index===0)throw Error('Missing sign character: '+ch);
 const tokens=[];for(const cmd of glyph.path.commands){tokens.push(cmd.type==='C'?'b':cmd.type.toLowerCase());for(const pair of [['x','y'],['x1','y1'],['x2','y2']])if(cmd[pair[0]]!==undefined)tokens.push(Math.round(cmd[pair[0]]),Math.round(cmd[pair[1]]));}
 glyphs[ch]={ha:glyph.advanceWidth,x_min:glyph.xMin??0,x_max:glyph.xMax??0,o:tokens.join(' ')};
}
fs.writeFileSync(path.join(root,'src/assets/sign-font.json'),JSON.stringify({glyphs,familyName:'DM Sans signage subset',resolution:font.unitsPerEm,ascender:font.ascender,descender:font.descender,underlineThickness:font.tables.post.underlineThickness,boundingBox:{yMin:font.descender,yMax:font.ascender}}));
console.log('Local signage font:',Object.keys(glyphs).length,'glyphs');

