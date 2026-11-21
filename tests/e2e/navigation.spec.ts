import { test, expect } from './fixtures';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const localRequire = createRequire(resolve('package.json'));
const axe = readFileSync(localRequire.resolve('axe-core/axe.min.js'), 'utf8');
for (const width of [360, 390, 768, 1280]) test(`one responsive pharmacy navigation supports keyboard search, current routes and contrast at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  const navigation = page.getByRole('navigation', { name: width < 900 ? 'Main navigation' : 'Shop navigation', exact: true });
  await expect(navigation).toHaveCount(1); await expect(navigation).toBeVisible();
  if (width < 900) await expect(navigation.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  else await expect(page.getByRole('banner').getByRole('link', { name: 'Al Mina Pharmacy home', exact: true })).toBeVisible();
  await page.keyboard.press('Tab'); const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.locator('#main-content')).toBeFocused();
  const search = page.getByRole('search', { name: 'Product search' }); const input = search.getByRole('combobox', { name: 'Search products' });
  await expect(input).toHaveAttribute('maxlength', '80'); await input.focus(); await input.fill('Daily'); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=Daily$/); await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await page.reload(); if(width<900)await page.getByRole('button',{name:'Filters',exact:true}).click(); await expect(page.getByRole('search', { name: 'Filter products' }).getByRole('searchbox')).toHaveValue('Daily');
  if(width<900)await page.keyboard.press('Escape');
  if(width<900){
    await expect(page.getByRole('button',{name:'Open shopping menu',exact:true})).toHaveCount(0);
    await navigation.getByRole('link',{name:'Shop',exact:true}).click();
  } else {
    await navigation.getByRole('button',{name:'All categories',exact:true}).click();
    await navigation.getByRole('link',{name:'Shop by category',exact:true}).focus();await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/\/categories$/);
  if(width<900)await expect(navigation.getByRole('link',{name:'Shop',exact:true})).toHaveAttribute('aria-current','page');
  else {await navigation.getByRole('button',{name:'All categories',exact:true}).click();await expect(navigation.getByRole('link',{name:'Shop by category',exact:true})).toHaveAttribute('aria-current','page');}
  const link = width < 900 ? navigation.getByRole('link', { name: 'Cart', exact: true }) : page.getByRole('banner').getByRole('link', { name: 'Your cart', exact: true });
  expect(await link.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(width < 900 ? 48 : 44);
  await link.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading', { name: 'A little room for your everyday essentials.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(axe);
  const violations = await page.evaluate(async () => {
    const audit = (window as unknown as { axe: { run: (node: Element) => Promise<{ violations: { id: string }[] }> } }).axe;
    return (await audit.run(document.body)).violations.map(item => item.id);
  });
  expect(violations).toEqual([]);
});
