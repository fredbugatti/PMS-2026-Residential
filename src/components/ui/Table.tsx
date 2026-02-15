import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={`w-full border-collapse ${className}`.trim()}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={`bg-slate-50 ${className}`.trim()}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TableHeader.displayName = 'TableHeader';

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <tbody ref={ref} className={className} {...props}>
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = 'TableBody';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${className}`.trim()}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${className}`.trim()}
        {...props}
      >
        {children}
      </th>
    );
  }
);

TableHead.displayName = 'TableHead';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={`px-4 py-3 text-sm text-slate-900 ${className}`.trim()}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = 'TableCell';
