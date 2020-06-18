# -*- coding: utf-8 -*-
{
    'name': "POS Cart Details",

    'summary': """Show cart details""",
    'description': """""",
    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necesary for this one to work correctly
    'depends': ['base', 'point_of_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
    'installable': True,
}
