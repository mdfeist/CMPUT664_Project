#!/usr/bin/env python

from xml.etree import ElementTree
import sys
from os import path as p

CSS_FILENAME = p.abspath(p.join(p.dirname(__file__), '..', 'www', 'css',
                                'graph-styles.css'))

_, filename, out_name = sys.argv

with open(filename, encoding='utf-8') as raw_svg:
    svg = ElementTree.fromstring(raw_svg.read())

with open(CSS_FILENAME, encoding='utf-8') as css_file:
    styles = css_file.read()

template = '''<style type="text/css">\
<![CDATA[
{0}
]]> 
</style>
'''

style_element = ElementTree.fromstring(template.format(styles))
svg.insert(0, style_element)

ElementTree.ElementTree(svg).write(out_name)
