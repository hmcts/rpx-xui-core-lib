import {test,expect} from '@playwright/test';
test('date updates validation as month and year change', async ({page})=>{
 await page.goto('/gov-date');
 await page.getByRole('textbox',{name:'Day'}).fill('29');
 await page.getByRole('textbox',{name:'Month'}).fill('2');
 await page.getByRole('textbox',{name:'Year'}).fill('2024');
 await expect(page.getByTestId('date-errors')).toHaveText('null');
 await page.getByRole('textbox',{name:'Year'}).fill('2023');
 await expect(page.getByTestId('date-errors')).toContainText('dateComponent');
 await expect(page.getByTestId('date-status')).toHaveText('INVALID');
 await page.getByRole('textbox',{name:'Month'}).fill('3');
 await expect(page.getByTestId('date-errors')).toHaveText('null');
 await expect(page.getByTestId('date-status')).toHaveText('VALID');
});
test('select changes the reactive form value', async ({page})=>{
 await page.goto('/gov-date'); const select=page.getByRole('combobox',{name:'Synthetic service'});
 await expect(select.getByRole('option')).toHaveText(['First','Second']);
 await select.selectOption('two'); await expect(page.getByTestId('selection')).toHaveText('two');
});

test('fieldset exposes its legend, hint and projected content', async ({page})=>{
 await page.goto('/gov-date');
 const group=page.getByRole('group',{name:'Synthetic group'});
 await expect(group).toHaveAccessibleDescription('Group hint');
 await expect(group.getByText('Projected content')).toBeVisible();
 await expect(group.getByRole('heading',{name:'Synthetic group'})).toHaveCount(0);
 await page.getByRole('button',{name:'Toggle heading'}).click();
 await expect(group.getByRole('heading',{level:1,name:'Synthetic group'})).toBeVisible();
 await page.getByRole('button',{name:'Toggle heading'}).click();
 await expect(group.getByRole('heading',{name:'Synthetic group'})).toHaveCount(0);
});

test('optional date accepts all empty parts but rejects an incomplete date', async ({page})=>{
 await page.goto('/gov-date'); await page.getByRole('button',{name:'Toggle optional'}).click();
 const day=page.getByRole('textbox',{name:'Day'}); await day.fill('1'); await day.clear();
 await expect(page.getByTestId('date-errors')).toHaveText('null');
 await page.getByRole('textbox',{name:'Month'}).fill('2');
 await expect(page.getByTestId('date-errors')).toContainText('dateComponent');
});

test('rejects an impossible day and recovers when the month changes', async ({page})=>{
 await page.goto('/gov-date');
 await page.getByRole('textbox',{name:'Day'}).fill('31');
 await page.getByRole('textbox',{name:'Month'}).fill('4');
 await page.getByRole('textbox',{name:'Year'}).fill('2024');
 await expect(page.getByTestId('date-errors')).toContainText('dateComponent');
 await page.getByRole('textbox',{name:'Month'}).fill('5');
 await expect(page.getByTestId('date-errors')).toHaveText('null');
});

test('date errors describe the correct fieldset without duplicate or missing targets', async ({page})=>{
 await page.goto('/gov-date');
 await page.getByRole('button',{name:'Show date errors'}).click();
 const first=page.getByRole('group',{name:'Synthetic date'});
 const second=page.getByRole('group',{name:'Other date'});
 await expect(first).toHaveAccessibleDescription('Synthetic hint Error:First date error');
 await expect(second).toHaveAccessibleDescription('Other hint Error:Second date error');
 await expect(page.locator('#date-error')).toHaveCount(1);
 await expect(page.locator('#other-error')).toHaveCount(1);
 const select=page.getByRole('combobox',{name:'Synthetic service'});
 await expect(select).toHaveAccessibleDescription('Error:Select error');
});

test('empty date and select messages never reference absent error elements', async ({page})=>{
 await page.goto('/gov-date');
 await page.getByRole('button',{name:'Show date errors'}).click();
 const first=page.getByRole('group',{name:'Synthetic date'});
 const second=page.getByRole('group',{name:'Other date'});
 const select=page.getByRole('combobox',{name:'Synthetic service'});
 await page.getByRole('button',{name:'Clear date messages'}).click();
 await expect(first).toHaveAccessibleDescription('Synthetic hint');
 await expect(second).toHaveAccessibleDescription('Other hint');
 await expect(first).toHaveAttribute('aria-describedby','date-hint');
 await expect(second).toHaveAttribute('aria-describedby','other-hint');
 await expect(select).not.toHaveAttribute('aria-describedby');
});
