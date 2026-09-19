// 复现：style 里的驼峰属性名读不到，驼峰写进去会变成两条打架的声明
import { describe, it } from 'vitest';
import { load } from '../src/index.js';

describe('现状', () => {
  it('打出全部现状', () => {
    const $ = load(
      '<p id=a style="background-color: blue">x</p><p id=b style="BACKGROUND-COLOR: red">y</p>',
    );
    console.log('1 a.css(background-color):', $('#a').css('background-color'));
    console.log('2 a.css(backgroundColor):', $('#a').css('backgroundColor'));
    console.log('3 b.css(background-color):', $('#b').css('background-color'));
    console.log('4 b.css(BACKGROUND-COLOR):', $('#b').css('BACKGROUND-COLOR'));
    $('#a').css('backgroundColor', 'green');
    console.log('5 after camel write, attr style:', $('#a').attr('style'));
    console.log('6 after camel write, read kebab:', $('#a').css('background-color'));
    $('#a').css('background-color', '');
    console.log('7 after empty kebab write:', $('#a').attr('style'));
    const $c = load('<p id=c style="color: red !important; font-family: Arial">z</p>');
    console.log('8 important value:', JSON.stringify($c('#c').css()));
    $('#b').css({ backgroundColor: 'black' });
    console.log('9 b map write:', $('#b').attr('style'));
    console.log('10 camel read on b:', $('#b').css('backgroundColor'));
  });
});
