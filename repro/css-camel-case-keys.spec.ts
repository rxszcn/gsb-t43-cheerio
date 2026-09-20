// 复现：style 里的属性名只认作者写进去的那种拼法，另一种拼法既读不到、写进去还会并出第二条
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
    $('#a').css('color', 'lime');
    $('#a').css('background-color', '');
    console.log('11 remove leaves siblings:', $('#a').attr('style'));
    const $v = load('<p id=v style="-webkit-transform: rotate(3deg)">w</p>');
    console.log('12 WebkitTransform read:', $v('#v').css('WebkitTransform'));
    console.log('13 kebab vendor read:', $v('#v').css('-webkit-transform'));
    console.log('14 camel vendor write then kebab read:', (() => {
      $v('#v').css('webkitTransform', 'none');
      return [$v('#v').attr('style'), $v('#v').css('-webkit-transform')];
    })());
    const $u = load('<p id=u style="--brand-color: #f00">u</p>');
    console.log('15 custom prop exact read:', $u('#u').css('--brand-color'));
    console.log('16 custom camel-ish read:', $u('#u').css('--brandColor'));
    console.log('17 full map:', JSON.stringify($u('#u').css()), JSON.stringify($v('#v').css()));

    // 后九条：声明名往外写的时候用谁的那一种拼法、原来那条还在不在原位
    const $d = load(
      '<p id=d style="font-family: Arial; backgroundColor: blue">t</p><p id=e style="color: red">u</p>',
    );
    console.log('18 authored camel read by kebab:', $d('#d').css('background-color'));
    console.log('19 map keys:', JSON.stringify(Object.keys($d('#d').css())));
    $d('#d').css('background-color', 'green');
    console.log('20 kebab write onto authored camel:', $d('#d').attr('style'));
    console.log('21 read it back by UPPER:', $d('#d').css('BACKGROUND-COLOR'));
    $d('#e').css('borderTopWidth', '2px');
    console.log('22 new decl keeps caller spelling:', $d('#e').attr('style'));
    console.log('23 new decl read by kebab:', $d('#e').css('border-top-width'));
    $d('#e').css('border-top-width', '');
    console.log('24 empty write removes that one decl:', $d('#e').attr('style'));
    const $f = load('<p id=f style="margin: 1px; WEBKIT-TRANSFORM: rotate(1deg); padding: 2px">f</p>');
    $f('#f').css('-webkit-transform', 'none');
    console.log('25 vendor three ways one decl:', $f('#f').attr('style'), '|', $f('#f').css('WebkitTransform'));
    console.log('26 map after mixed writes:', JSON.stringify($f('#f').css()));
  });
});
