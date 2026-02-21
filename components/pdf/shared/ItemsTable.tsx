import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { commonStyles } from './styles';
import { formatCurrency } from '@/utils/formatters/currency';

export interface TableColumn {
    header: string;
    field: string;
    width: string;
    align?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
}

interface ItemsTableProps {
    columns: TableColumn[];
    items: any[];
    zebraStripe?: boolean;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
    columns,
    items,
    zebraStripe = false,
}) => {
    const getAlignStyle = (align?: 'left' | 'center' | 'right') => {
        if (align === 'center') return commonStyles.textCenter;
        if (align === 'right') return commonStyles.textRight;
        return {};
    };

    return (
        <View style={commonStyles.table}>
            {/* Table Header */}
            <View style={commonStyles.tableHeader}>
                {columns.map((col, index) => (
                    <Text
                        key={index}
                        style={[
                            commonStyles.tableHeaderText,
                            { width: col.width },
                            getAlignStyle(col.align),
                        ]}
                    >
                        {col.header}
                    </Text>
                ))}
            </View>

            {/* Table Rows */}
            {items.map((item, rowIndex) => (
                <View
                    key={rowIndex}
                    style={[
                        commonStyles.tableRow,
                        ...(zebraStripe && rowIndex % 2 === 1 ? [commonStyles.tableRowAlt] : []),
                    ]}
                >
                    {columns.map((col, colIndex) => {
                        const value = item[col.field];
                        const displayValue = col.format ? col.format(value) : value;
                        const isBold = col.align === 'right' && col.field.includes('total');

                        return (
                            <Text
                                key={colIndex}
                                style={[
                                    isBold ? commonStyles.tableCellBold : commonStyles.tableCell,
                                    { width: col.width },
                                    getAlignStyle(col.align),
                                ]}
                            >
                                {displayValue}
                            </Text>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

// ============================================================================
// PRE-CONFIGURED TABLE LAYOUTS
// ============================================================================

export const InvoiceTableColumns: TableColumn[] = [
    { header: 'Description', field: 'description', width: '40%', align: 'left' },
    { header: 'Quantity', field: 'quantity', width: '15%', align: 'center' },
    { header: 'Rate', field: 'rate', width: '20%', align: 'right', format: formatCurrency },
    { header: 'Total', field: 'total', width: '25%', align: 'right', format: formatCurrency },
];

export const PurchaseTableColumns: TableColumn[] = [
    { header: 'Material', field: 'materialName', width: '40%', align: 'left' },
    { header: 'Quantity', field: 'quantity', width: '15%', align: 'center' },
    { header: 'Unit Cost', field: 'unitCost', width: '20%', align: 'right', format: formatCurrency },
    { header: 'Total', field: 'total', width: '25%', align: 'right', format: formatCurrency },
];

export const SalesReturnTableColumns: TableColumn[] = [
    { header: 'Product', field: 'productName', width: '40%', align: 'left' },
    { header: 'Returned Qty', field: 'returnQuantity', width: '20%', align: 'center' },
    { header: 'Rate', field: 'rate', width: '20%', align: 'right', format: formatCurrency },
    { header: 'Total', field: 'total', width: '20%', align: 'right', format: formatCurrency },
];

export const PurchaseReturnTableColumns: TableColumn[] = [
    { header: 'Material', field: 'materialName', width: '30%', align: 'left' },
    { header: 'Ordered', field: 'orderedQuantity', width: '15%', align: 'center', format: (v) => v?.toFixed(2) || '0.00' },
    { header: 'Received', field: 'receivedQuantity', width: '15%', align: 'center', format: (v) => v?.toFixed(2) || '0.00' },
    { header: 'Returned', field: 'returnQuantity', width: '15%', align: 'center', format: (v) => v?.toFixed(2) || '0.00' },
    { header: 'Total', field: 'total', width: '25%', align: 'right', format: formatCurrency },
];