# -*- coding: utf-8 -*-
{
    'name': "POS Product Return",
    'summary': """Return products in POS""",
    'description': """This module allow to return products in POS sessions""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'kzm_pos_side_bar'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/pos_config.xml',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
}