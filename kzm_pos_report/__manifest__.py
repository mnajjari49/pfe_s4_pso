# -*- coding: utf-8 -*-
{
    'name': "POS Reports",

    'summary': """Show POS Reports""",
    'description': """""",
    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necesary for this one to work correctly
    'depends': ['base', 'kzm_pos_config'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/templates.xml',
        'views/pos_config.xml',
        'views/res_users_view.xml',
        'views/pos_x_thermal_report.xml',
        'views/pos_z_thermal_report.xml',
        'views/pos_z_report_template.xml',
        'reports.xml',
        'views/front_sales_report_pdf_template.xml',
        'views/front_inventory_session_thermal_report_template.xml',
        'views/front_inventory_session_pdf_report_template.xml',
        'views/front_inventory_location_pdf_report_template.xml',
        'views/front_inventory_location_thermal_report_template.xml',
        'report/grp_category_product_expiry_report_template.xml',

    ],
    'qweb': ['static/src/xml/*.xml'],
    'installable': True,
}
