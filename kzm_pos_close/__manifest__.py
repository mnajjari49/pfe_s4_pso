# -*- coding: utf-8 -*-
{
    'name': "POS CLOSE",
    'summary': """To close sessions in pos""",
    'description': """This module allow to directly close POS sessions""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Uncategorized',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'point_of_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/popup.xml'],
}