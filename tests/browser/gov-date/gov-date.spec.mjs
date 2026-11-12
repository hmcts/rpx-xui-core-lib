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
