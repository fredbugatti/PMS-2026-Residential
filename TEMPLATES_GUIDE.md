# Document Templates Guide

## Overview

The Document Templates system allows you to create, manage, and generate custom documents with automatic data population from your leases and properties.

## Features

✅ **Pre-built Templates** - 8 professional templates ready to use
✅ **Custom Templates** - Create your own templates with HTML
✅ **Merge Fields** - Auto-populate tenant, property, and lease data
✅ **Categories** - Organize templates by type
✅ **Edit & Delete** - Full CRUD operations on custom templates
✅ **Preview** - See template content before generating
✅ **Generate** - Create documents with real lease data
✅ **Print & Download** - Export generated documents

## Accessing Templates

Navigate to **Documents** from the sidebar under Property Management section.

## Creating a Custom Template

1. Click the **"+ Create Template"** button
2. Fill in the template details:
   - **Name**: Descriptive name for your template
   - **Category**: Choose from 17 categories
   - **Description**: Brief explanation of the template's purpose
   - **Template Content**: HTML content with merge fields
   - **Merge Fields**: List the fields you're using (comma-separated)
   - **File Type**: PDF, DOCX, or HTML

### Example Template

```html
<div style="font-family: Arial, sans-serif; padding: 40px;">
  <h1>Welcome Letter</h1>

  <p>Dear {{tenantName}},</p>

  <p>Welcome to your new home at {{propertyAddress}}, Unit {{unitNumber}}!</p>

  <p>Your lease begins on {{startDate}} and your monthly rent is ${{monthlyRent}}.</p>

  <p>If you have any questions, please don't hesitate to contact us.</p>

  <p>Sincerely,<br>Property Management</p>
</div>
```

## Available Merge Fields

The system automatically populates these fields from lease data:

### Tenant Information
- `{{tenantName}}` - Tenant's full name
- `{{tenantEmail}}` - Tenant's email address
- `{{tenantPhone}}` - Tenant's phone number

### Property Information
- `{{propertyName}}` - Property name
- `{{propertyAddress}}` - Street address
- `{{propertyCity}}` - City
- `{{propertyState}}` - State
- `{{propertyZipCode}}` - ZIP code

### Unit Information
- `{{unitName}}` - Unit identifier
- `{{unitNumber}}` - Unit number
- `{{bedrooms}}` - Number of bedrooms
- `{{bathrooms}}` - Number of bathrooms

### Lease Information
- `{{monthlyRent}}` - Monthly rent amount
- `{{securityDeposit}}` - Security deposit amount
- `{{startDate}}` - Lease start date
- `{{endDate}}` - Lease end date

### Dates
- `{{currentDate}}` - Today's date

## Generating Documents

1. Browse templates on the Documents page
2. Click **"Generate"** on any template
3. Select a lease from the dropdown
4. Click **"Generate Document"**
5. Review the generated document
6. Use **"Print"** or **"Download"** buttons

## Managing Templates

### Edit a Template
- Click **"Edit"** on any custom template
- Modify the fields
- Click **"Update Template"**

### Delete a Template
- Click **"Delete"** on any custom template
- Confirm deletion

**Note**: System templates (marked with "System" badge) cannot be edited or deleted.

## Template Categories

1. **Lease Agreements** - Standard rental contracts
2. **Lease Amendments** - Modifications to existing leases
3. **Notice to Vacate** - Move-out notices
4. **Rent Increase Notices** - Rent change notifications
5. **Lease Renewals** - Renewal offers
6. **Move-In Checklists** - Property condition forms
7. **Move-Out Checklists** - Exit inspection forms
8. **Receipts** - Payment confirmations
9. **Invoices** - Billing documents
10. **Violation Notices** - Lease violation warnings
11. **Late Rent Notices** - Payment reminders
12. **3-Day Notices** - Legal eviction notices
13. **Eviction Notices** - Formal eviction documents
14. **Maintenance Authorization** - Work order approvals
15. **Pet Addendums** - Pet policy agreements
16. **Parking Agreements** - Parking space contracts
17. **Other Documents** - Miscellaneous templates

## Tips for Creating Templates

### HTML Styling
Use inline CSS for best results:
```html
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h1 style="color: #333; text-align: center;">Title</h1>
  <p style="line-height: 1.6;">Content here...</p>
</div>
```

### Merge Field Format
Always use double curly braces:
- ✅ Correct: `{{tenantName}}`
- ❌ Wrong: `{tenantName}`
- ❌ Wrong: `$tenantName`

### Testing Templates
1. Create a test template
2. Generate with actual lease data
3. Review output carefully
4. Edit and refine as needed

### Professional Formatting
- Use consistent fonts (Arial, Times New Roman)
- Include proper spacing and margins
- Add headers and footers
- Use tables for structured data
- Add signature lines where needed

## System Templates

The following templates are included by default:

1. **Standard Residential Lease Agreement** - Comprehensive lease document
2. **Rent Increase Notice** - 60-day notice template
3. **3-Day Notice to Pay Rent or Quit** - Legal eviction notice
4. **Move-In Inspection Checklist** - Property condition form
5. **Notice to Vacate** - Termination notice
6. **Pet Addendum** - Pet policy addendum
7. **Late Rent Notice** - Payment reminder
8. **Maintenance Authorization Form** - Work order authorization

## Troubleshooting

### Template Not Saving
- Ensure all required fields are filled (marked with *)
- Check that template content is valid HTML
- Verify merge fields are properly formatted

### Merge Fields Not Populating
- Confirm field names match exactly (case-sensitive)
- Ensure lease has the required data
- Check for typos in field names

### Document Not Generating
- Verify a lease is selected
- Check that the lease has the necessary data
- Ensure template is active

## API Reference

For developers integrating with the template system:

### Endpoints
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create template
- `GET /api/templates/[id]` - Get template details
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template
- `POST /api/templates/generate` - Generate document

### Example API Call
```javascript
const response = await fetch('/api/templates/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'template-id-here',
    leaseId: 'lease-id-here'
  })
});

const result = await response.json();
console.log(result.content); // Generated HTML
```

## Support

For questions or issues with the template system, please contact the development team or refer to the main application documentation.
