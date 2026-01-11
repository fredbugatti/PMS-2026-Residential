import { PrismaClient, DocumentCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTemplates() {
  console.log('Seeding document templates...');

  const templates = [
    {
      name: 'Standard Residential Lease Agreement',
      description: 'A comprehensive lease agreement for residential properties',
      category: 'LEASE_AGREEMENT' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'tenantEmail',
        'tenantPhone',
        'propertyAddress',
        'propertyCity',
        'propertyState',
        'propertyZipCode',
        'unitNumber',
        'monthlyRent',
        'securityDeposit',
        'startDate',
        'endDate',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">RESIDENTIAL LEASE AGREEMENT</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <h2>1. PARTIES</h2>
          <p>This Lease Agreement is entered into between:</p>
          <p><strong>Landlord:</strong> Property Management</p>
          <p><strong>Tenant:</strong> {{tenantName}}<br>
          Email: {{tenantEmail}}<br>
          Phone: {{tenantPhone}}</p>

          <h2>2. PROPERTY</h2>
          <p>The Landlord agrees to lease to the Tenant the following property:</p>
          <p><strong>Address:</strong> {{propertyAddress}}, Unit {{unitNumber}}<br>
          {{propertyCity}}, {{propertyState}} {{propertyZipCode}}</p>

          <h2>3. TERM</h2>
          <p>The lease term begins on <strong>{{startDate}}</strong> and ends on <strong>{{endDate}}</strong>.</p>

          <h2>4. RENT</h2>
          <p>The monthly rent is <strong>$` + `{{monthlyRent}}</strong>, due on the 1st day of each month.</p>

          <h2>5. SECURITY DEPOSIT</h2>
          <p>Tenant has paid a security deposit of <strong>$` + `{{securityDeposit}}</strong>.</p>

          <h2>6. TENANT RESPONSIBILITIES</h2>
          <ul>
            <li>Pay rent on time</li>
            <li>Maintain the property in good condition</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not make alterations without written consent</li>
            <li>Allow landlord access for inspections and repairs</li>
          </ul>

          <h2>7. LANDLORD RESPONSIBILITIES</h2>
          <ul>
            <li>Maintain the property in habitable condition</li>
            <li>Make necessary repairs in a timely manner</li>
            <li>Comply with all applicable housing codes</li>
            <li>Respect tenant's privacy and right to quiet enjoyment</li>
          </ul>

          <div style="margin-top: 60px;">
            <p>____________________________________<br>
            <strong>Landlord Signature</strong><br>
            Date: _______________</p>

            <p style="margin-top: 40px;">____________________________________<br>
            <strong>Tenant Signature: {{tenantName}}</strong><br>
            Date: _______________</p>
          </div>
        </div>
      `
    },
    {
      name: 'Rent Increase Notice',
      description: 'Notice to inform tenant of upcoming rent increase',
      category: 'RENT_INCREASE_NOTICE' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate',
        'monthlyRent'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">NOTICE OF RENT INCREASE</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <p>Dear {{tenantName}},</p>

          <p>This letter is to inform you that the monthly rent for your residence at:</p>

          <p><strong>{{propertyAddress}}, Unit {{unitNumber}}</strong></p>

          <p>will be increased to <strong>$` + `{{monthlyRent}}</strong> per month, effective 60 days from the date of this notice.</p>

          <p>Your current rent will remain in effect until the increase takes effect. The new rent amount will be due on the first day of the month following the effective date.</p>

          <p>We value you as a tenant and appreciate your understanding. If you have any questions or concerns, please contact our office.</p>

          <p style="margin-top: 40px;">Sincerely,</p>
          <p><strong>Property Management</strong></p>
        </div>
      `
    },
    {
      name: '3-Day Notice to Pay Rent or Quit',
      description: 'Legal notice for unpaid rent',
      category: 'THREE_DAY_NOTICE' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">THREE-DAY NOTICE TO PAY RENT OR QUIT</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <p><strong>TO:</strong> {{tenantName}}<br>
          <strong>ADDRESS:</strong> {{propertyAddress}}, Unit {{unitNumber}}</p>

          <p style="margin-top: 30px;">You are hereby notified that you are in default of your lease agreement for failure to pay rent when due.</p>

          <p>You have <strong>THREE (3) DAYS</strong> from service of this notice to either:</p>

          <ol>
            <li>Pay all past due rent, OR</li>
            <li>Vacate and surrender possession of the premises</li>
          </ol>

          <p>Failure to pay the rent due or vacate the premises within three (3) days will result in legal action to evict you from the premises and recover rent and other damages.</p>

          <p style="margin-top: 40px;"><strong>Property Management</strong></p>
        </div>
      `
    },
    {
      name: 'Move-In Inspection Checklist',
      description: 'Detailed checklist for documenting property condition at move-in',
      category: 'MOVE_IN_CHECKLIST' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">MOVE-IN INSPECTION CHECKLIST</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>
          <p><strong>Tenant:</strong> {{tenantName}}</p>
          <p><strong>Property:</strong> {{propertyAddress}}, Unit {{unitNumber}}</p>

          <p style="margin-top: 30px;">Please inspect each area and note the condition. Use: E=Excellent, G=Good, F=Fair, P=Poor, N/A=Not Applicable</p>

          <h2>LIVING ROOM</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Walls/Paint</td>
              <td style="padding: 8px; width: 100px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Flooring/Carpet</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Windows/Screens</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Light Fixtures</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
          </table>

          <h2>KITCHEN</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Appliances</td>
              <td style="padding: 8px; width: 100px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Cabinets/Counters</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Sink/Plumbing</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
          </table>

          <h2>BATHROOMS</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Toilet</td>
              <td style="padding: 8px; width: 100px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Shower/Tub</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Sink/Vanity</td>
              <td style="padding: 8px;">_______</td>
              <td style="padding: 8px;">Comments: _______________</td>
            </tr>
          </table>

          <div style="margin-top: 60px;">
            <p>____________________________________<br>
            <strong>Tenant Signature: {{tenantName}}</strong><br>
            Date: _______________</p>

            <p style="margin-top: 40px;">____________________________________<br>
            <strong>Property Manager Signature</strong><br>
            Date: _______________</p>
          </div>
        </div>
      `
    },
    {
      name: 'Notice to Vacate',
      description: 'Notice from landlord requesting tenant to vacate',
      category: 'NOTICE_TO_VACATE' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">NOTICE TO VACATE</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <p><strong>TO:</strong> {{tenantName}}<br>
          <strong>ADDRESS:</strong> {{propertyAddress}}, Unit {{unitNumber}}</p>

          <p style="margin-top: 30px;">This letter serves as official notice that your tenancy at the above-mentioned property will be terminated.</p>

          <p>You are required to vacate the premises and return possession to the landlord by the end of your current lease term or within 30 days from the date of this notice, whichever is later.</p>

          <p><strong>Move-Out Requirements:</strong></p>
          <ul>
            <li>Remove all personal belongings</li>
            <li>Clean the entire unit thoroughly</li>
            <li>Repair any damages beyond normal wear and tear</li>
            <li>Return all keys and access devices</li>
            <li>Provide forwarding address for security deposit return</li>
          </ul>

          <p>A move-out inspection will be scheduled. Please contact our office to arrange a convenient time.</p>

          <p style="margin-top: 40px;">Sincerely,</p>
          <p><strong>Property Management</strong></p>
        </div>
      `
    },
    {
      name: 'Pet Addendum',
      description: 'Addendum to lease agreement allowing pets',
      category: 'PET_ADDENDUM' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">PET ADDENDUM TO LEASE AGREEMENT</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <p>This Pet Addendum is attached to and forms part of the Lease Agreement dated _________ between:</p>

          <p><strong>Landlord:</strong> Property Management<br>
          <strong>Tenant:</strong> {{tenantName}}<br>
          <strong>Property:</strong> {{propertyAddress}}, Unit {{unitNumber}}</p>

          <h2>PET INFORMATION</h2>
          <p>Type: _______________<br>
          Breed: _______________<br>
          Name: _______________<br>
          Weight: _______________<br>
          Age: _______________<br>
          Color: _______________</p>

          <h2>TERMS AND CONDITIONS</h2>
          <ol>
            <li>A non-refundable pet fee of $_________ is required.</li>
            <li>An additional pet deposit of $_________ is required.</li>
            <li>Monthly pet rent of $_________ will be added to the regular rent.</li>
            <li>Tenant agrees to keep pet under control at all times.</li>
            <li>Tenant is responsible for any damage caused by the pet.</li>
            <li>Tenant agrees to clean up after pet immediately.</li>
            <li>Pet must be licensed and vaccinated as required by law.</li>
            <li>Tenant will not leave pet unattended for extended periods.</li>
            <li>Landlord may revoke pet permission for violations.</li>
          </ol>

          <div style="margin-top: 60px;">
            <p>____________________________________<br>
            <strong>Landlord Signature</strong><br>
            Date: _______________</p>

            <p style="margin-top: 40px;">____________________________________<br>
            <strong>Tenant Signature: {{tenantName}}</strong><br>
            Date: _______________</p>
          </div>
        </div>
      `
    },
    {
      name: 'Late Rent Notice',
      description: 'Notice to tenant regarding late rent payment',
      category: 'LATE_RENT_NOTICE' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">LATE RENT NOTICE</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <p>Dear {{tenantName}},</p>

          <p><strong>Property:</strong> {{propertyAddress}}, Unit {{unitNumber}}</p>

          <p>This is to inform you that your rent payment for the current month is overdue.</p>

          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Due Date: _____________</li>
            <li>Amount Due: $_____________</li>
            <li>Late Fee: $_____________</li>
            <li><strong>Total Amount Due: $_____________</strong></li>
          </ul>

          <p>Please remit payment immediately to avoid further late fees and potential legal action.</p>

          <p><strong>Payment Methods:</strong></p>
          <ul>
            <li>Online payment portal</li>
            <li>Mail check to: _____________</li>
            <li>In-person at office</li>
          </ul>

          <p>If you are experiencing financial difficulties, please contact our office immediately to discuss payment arrangements.</p>

          <p style="margin-top: 40px;">Sincerely,</p>
          <p><strong>Property Management</strong></p>
        </div>
      `
    },
    {
      name: 'Maintenance Authorization Form',
      description: 'Authorization for emergency maintenance entry',
      category: 'MAINTENANCE_AUTHORIZATION' as DocumentCategory,
      isSystem: true,
      createdBy: 'system',
      fileType: 'pdf',
      mergeFields: [
        'tenantName',
        'propertyAddress',
        'unitNumber',
        'currentDate'
      ],
      templateContent: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <h1 style="text-align: center; margin-bottom: 30px;">MAINTENANCE AUTHORIZATION FORM</h1>

          <p><strong>Date:</strong> {{currentDate}}</p>

          <p><strong>Tenant:</strong> {{tenantName}}<br>
          <strong>Property:</strong> {{propertyAddress}}, Unit {{unitNumber}}</p>

          <h2>AUTHORIZED MAINTENANCE</h2>
          <p>Description of work to be performed:</p>
          <p style="border: 1px solid #ddd; padding: 10px; min-height: 100px;">
            _________________________________________________________________
            <br>_________________________________________________________________
            <br>_________________________________________________________________
          </p>

          <h2>ENTRY AUTHORIZATION</h2>
          <p>I authorize Property Management and/or its contractors to enter the above premises to perform the described maintenance work.</p>

          <p><strong>Preferred Date/Time:</strong> _______________________</p>

          <p>☐ I will be present during the work<br>
          ☐ Entry authorized without tenant present</p>

          <h2>COST AUTHORIZATION</h2>
          <p>☐ Covered by landlord (normal maintenance)<br>
          ☐ Tenant responsible (tenant-caused damage)<br>
          ☐ Cost to be determined</p>

          <p><strong>Estimated Cost:</strong> $_____________</p>

          <div style="margin-top: 60px;">
            <p>____________________________________<br>
            <strong>Tenant Signature: {{tenantName}}</strong><br>
            Date: _______________</p>

            <p style="margin-top: 40px;">____________________________________<br>
            <strong>Property Manager Signature</strong><br>
            Date: _______________</p>
          </div>
        </div>
      `
    }
  ];

  for (const template of templates) {
    try {
      await prisma.documentTemplate.create({
        data: template
      });
      console.log(`✓ Created template: ${template.name}`);
    } catch (error) {
      console.error(`✗ Failed to create template: ${template.name}`, error);
    }
  }

  console.log('\nTemplate seeding completed!');
}

seedTemplates()
  .catch((e) => {
    console.error('Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
