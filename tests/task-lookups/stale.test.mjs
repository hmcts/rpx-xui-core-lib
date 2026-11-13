import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Subject } from 'rxjs';
import { FindTaskNameComponent } from '@hmcts/rpx-xui-core-lib/ui/find-task-name';
import { SearchWorkTypeComponent } from '@hmcts/rpx-xui-core-lib/ui/search-work-type';
import { FindWorkTypeComponent } from '@hmcts/rpx-xui-core-lib/ui/find-work-type';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

const wait = () => new Promise(resolve => setTimeout(resolve, 360));
const task = label => ({ task_type: { task_type_name: label } });
const detector = { detectChanges() {}, markForCheck() {}, detach() {}, checkNoChanges() {}, reattach() {} };
/** @param {unknown} value */
const taskService = value => /** @type {import('@hmcts/rpx-xui-core-lib/ui/task-data').TaskService} */ (value);
/** @param {unknown} value */
const searchComponent = value => /** @type {import('@hmcts/rpx-xui-core-lib/ui/search-work-type').SearchWorkTypeComponent} */ (value);

test('task-name cancels earlier response when input changes', async t => {
  const requests = [];
  const component = new FindTaskNameComponent(detector, taskService({ getTaskName() { const request = new Subject(); requests.push(request); return request; } }));
  component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('old'); await wait();
  assert.equal(requests.length, 1);
  component.findTaskNameControl.setValue('new'); requests[0].next([task('old')]);
  assert.deepEqual(component.filteredOptions, []);
});

test('work-type cancels earlier response when input changes', async t => {
  const requests = [];
  const component = new SearchWorkTypeComponent(taskService({ searchWorkTypes() { const request = new Subject(); requests.push(request); return request; } }));
  component.ngOnInit(); const values = []; const sub = component.filteredList$.subscribe(value => values.push(value)); t.after(() => sub.unsubscribe());
  component.searchTermFormControl.setValue('old'); await wait();
  assert.equal(requests.length, 1);
  component.searchTermFormControl.setValue('new'); requests[0].next([{ key: 'old', label: 'Old' }]);
  assert.equal(values.some(Array.isArray), false);
});

test('disabling work-type clears all selected values', () => {
  const component = new FindWorkTypeComponent();
  component.field = { name: 'workTypes', options: [], minSelected: 0, maxSelected: 3, type: 'find-work-type' };
  component.form = new FormGroup({ workTypes: new FormArray(['a', 'b', 'c'].map(key => new FormControl({ key, label: key }))) });
  component.searchWorkTypeComponent = searchComponent({ resetSearchTerm() {} });
  component.disabled = true;
  assert.deepEqual(component.form.get('workTypes').value, []);
});

test('task-name reports request failure and can search again', async t => {
  const { config } = await import('rxjs');
  const previous = config.onUnhandledError;
  const unhandled = []; config.onUnhandledError = error => unhandled.push(error);
  t.after(() => { config.onUnhandledError = previous; });
  const requests = [];
  const component = new FindTaskNameComponent(detector, taskService({ getTaskName() { const request = new Subject(); requests.push(request); return request; } }));
  component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('fail'); await wait(); requests[0].error(new Error('synthetic service failure'));
  assert.equal(component.lookupFailed, true);
  component.findTaskNameControl.setValue('next'); await wait();
  assert.equal(requests.length, 2);
  requests[1].next([task('next')]);
  assert.equal(component.lookupFailed, false);
  assert.equal(component.filteredOptions[0].task_type.task_type_name, 'next');
  await new Promise(resolve => setTimeout(resolve, 0)); assert.deepEqual(unhandled, []);
});

test('task-name reuses an existing parent control on recreation', async t => {
  const control = new FormControl('existing'); const group = new FormGroup({ findTaskNameControl: control });
  const component = new FindTaskNameComponent(detector, taskService({ getTaskName() { return new Subject(); } }));
  component.findTaskNameGroup = group; component.ngOnInit(); t.after(() => component.ngOnDestroy());
  assert.equal(component.findTaskNameControl, control);
});

for (const failure of ['malformed cache', 'storage exception']) {
  test(`task-name handles synchronous ${failure} and recovers on next input`, async t => {
    const { TaskService } = await import('@hmcts/rpx-xui-core-lib/ui/task-data');
    const { config } = await import('rxjs');
    const previous = config.onUnhandledError; const unhandled = []; config.onUnhandledError = error => unhandled.push(error);
    t.after(() => { config.onUnhandledError = previous; });
    let broken = true;
    const storage = {
      getItem() { if (broken && failure === 'storage exception') throw new Error('synthetic storage failure'); return broken ? '{bad' : null; },
      setItem() {}
    };
    const requests = [];
    const service = new TaskService(/** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ ({ post() { const request = new Subject(); requests.push(request); return request; } })), /** @type {import('@hmcts/rpx-xui-core-lib/browser/session-storage').SessionStorageService} */ (/** @type {unknown} */ (storage)));
    const component = new FindTaskNameComponent(detector, service);
    component.ngOnInit(); t.after(() => component.ngOnDestroy());
    component.findTaskNameControl.setValue('first'); await wait();
    assert.equal(component.lookupFailed, true);
    broken = false; component.findTaskNameControl.setValue('next'); await wait();
    assert.equal(requests.length, 1);
    requests[0].next([task('next')]);
    assert.equal(component.lookupFailed, false);
    assert.equal(component.filteredOptions[0].task_type.task_type_name, 'next');
    await new Promise(resolve => setTimeout(resolve, 0)); assert.deepEqual(unhandled, []);
  });
}

for (const cached of [false, true]) {
  test(`work-type ${cached ? 'cached-service' : 'default'} lookup reports error and recovers`, async t => {
    const requests = [];
    const component = new SearchWorkTypeComponent(taskService({ searchWorkTypes() { const request = new Subject(); requests.push(request); return request; } }));
    component.field = { name: 'workTypes', options: [], minSelected: 0, maxSelected: 2, type: 'find-work-type', servicesField: cached ? 'services' : undefined };
    component.ngOnInit(); let failure;
    const values = []; const sub = component.filteredList$.subscribe({ next: value => values.push(value), error: error => { failure = error; } }); t.after(() => sub.unsubscribe());
    component.searchTermFormControl.setValue('first'); if (!cached) await wait();
    assert.equal(requests.length, 1); requests[0].error(new Error('synthetic service failure'));
    assert.equal(component.lookupFailed, true);
    assert.equal(failure, undefined);
    component.searchTermFormControl.setValue('second'); if (!cached) await wait();
    assert.equal(requests.length, 2); requests[1].next([{ key: 'second', label: 'Second' }]);
    assert.equal(component.lookupFailed, false);
    assert.equal(values.at(-1)[0].key, 'second');
  });
}

test('task-name reports malformed task payload and accepts a later valid response', async t => {
  const { config } = await import('rxjs'); const previous = config.onUnhandledError; const unhandled = []; config.onUnhandledError = error => unhandled.push(error); t.after(() => { config.onUnhandledError = previous; });
  const requests = []; const component = new FindTaskNameComponent(detector, taskService({ getTaskName() { const request = new Subject(); requests.push(request); return request; }, getTaskNameUncached() { const request = new Subject(); requests.push(request); return request; } }));
  component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('first'); await wait();
  requests[0].next([{ taskId: 1, taskName: 'Flat' }]);
  assert.equal(component.lookupFailed, true);
  assert.deepEqual(component.filteredOptions, []);
  component.findTaskNameControl.setValue('next'); await wait();
  requests[1].next([task('next')]);
  assert.equal(component.lookupFailed, false);
  assert.equal(component.filteredOptions[0].task_type.task_type_name, 'next');
  await new Promise(resolve => setTimeout(resolve, 0)); assert.deepEqual(unhandled, []);
});

test('task-name retries incompatible cached results without modifying shared cache', async t => {
  const { TaskService } = await import('@hmcts/rpx-xui-core-lib/ui/task-data');
  const original = JSON.stringify([{ taskId: 1, taskName: 'Flat' }]);
  const values = new Map([['IA-taskNames', original], ['other-taskNames', 'unrelated']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const requests = [];
  const service = new TaskService(/** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ ({ post() { const request = new Subject(); requests.push(request); return request; } })), /** @type {import('@hmcts/rpx-xui-core-lib/browser/session-storage').SessionStorageService} */ (/** @type {unknown} */ (storage)));
  const component = new FindTaskNameComponent(detector, service);
  component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('first'); await wait();
  assert.equal(component.lookupFailed, true);
  assert.equal(values.get('IA-taskNames'), original);
  component.findTaskNameControl.setValue('next'); await wait();
  assert.equal(requests.length, 1);
  values.set('IA-taskNames', 'concurrent-newer-value');
  requests[0].next([task('next')]);
  assert.equal(component.lookupFailed, false);
  assert.equal(component.filteredOptions[0].task_type.task_type_name, 'next');
  assert.equal(values.get('IA-taskNames'), 'concurrent-newer-value');
  assert.equal(values.get('other-taskNames'), 'unrelated');
});

test('task-name cancels an active request when its service changes', async t => {
  const { TaskService } = await import('@hmcts/rpx-xui-core-lib/ui/task-data');
  const validB = JSON.stringify([task('B cached')]);
  const values = new Map([['B-taskNames', validB]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const requests = [];
  const service = new TaskService(/** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ ({ post(_url, body) { const request = new Subject(); requests.push({body, request}); return request; } })), /** @type {import('@hmcts/rpx-xui-core-lib/browser/session-storage').SessionStorageService} */ (/** @type {unknown} */ (storage)));
  const component = new FindTaskNameComponent(detector, service);
  component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('first'); await wait();
  assert.equal(requests[0].body.service, 'IA');
  component.services = 'B'; requests[0].request.next([{ taskId: 1, taskName: 'Flat' }]);
  assert.equal(component.lookupFailed, false);
  assert.deepEqual(component.filteredOptions, []);
  component.findTaskNameControl.setValue('B'); await wait();
  assert.equal(requests.length, 1); assert.equal(component.filteredOptions[0].task_type.task_type_name, 'B cached');
  component.services = 'IA'; component.findTaskNameControl.setValue('retry'); await wait();
  assert.equal(requests.length, 2); assert.equal(requests[1].body.service, 'IA');
  requests[1].request.next([task('retry')]); assert.equal(component.lookupFailed, false);
  assert.equal(values.get('B-taskNames'), validB);
});

test('task-name retries corrupt cache without writing on a failed uncached request', async t => {
  const { TaskService } = await import('@hmcts/rpx-xui-core-lib/ui/task-data');
  const values = new Map([['IA-taskNames', '{bad'], ['other-taskNames', 'other']]);
  let writes = 0;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes++; values.set(key, value); } };
  const requests = [];
  const service = new TaskService(/** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ ({ post() { const request = new Subject(); requests.push(request); return request; } })), /** @type {import('@hmcts/rpx-xui-core-lib/browser/session-storage').SessionStorageService} */ (/** @type {unknown} */ (storage)));
  const component = new FindTaskNameComponent(detector, service);
  component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('first'); await wait(); assert.equal(component.lookupFailed, true);
  component.findTaskNameControl.setValue('second'); await wait(); requests[0].error(new Error('synthetic HTTP failure'));
  assert.equal(component.lookupFailed, true); assert.equal(writes, 0);
  component.findTaskNameControl.setValue('third'); await wait(); requests[1].next([task('third')]);
  assert.equal(component.lookupFailed, false); assert.equal(component.filteredOptions[0].task_type.task_type_name, 'third');
  assert.equal(writes, 0); assert.equal(values.get('IA-taskNames'), '{bad'); assert.equal(values.get('other-taskNames'), 'other');
});

test('task-name preserves null event and selected task object contract', async t => {
  const requests = []; const selected = [];
  const component = new FindTaskNameComponent(detector, taskService({ getTaskName() { const request = new Subject(); requests.push(request); return request; } }));
  component.taskNameSelected.subscribe(value => selected.push(value)); component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('alpha'); await wait();
  assert.deepEqual(selected, ['null']);
  const choice = task('Alpha'); requests[0].next([choice]); component.onSelectionChange(choice);
  assert.equal(component.findTaskNameControl.value, 'Alpha'); assert.equal(selected[1], choice);
  assert.equal(component.getTaskTypeName(choice), 'Alpha'); assert.equal(component.getTaskTypeName(null), '');
  await wait(); assert.equal(requests.length, 1);
});

test('work-type multi-selection excludes selected keys but single mode preserves results', async t => {
  const requests = [];
  const component = new SearchWorkTypeComponent(taskService({ searchWorkTypes(term) { const request = new Subject(); requests.push({ term, request }); return request; } }));
  component.selectedWorkTypes = [{ key: 'a', label: 'A' }]; component.ngOnInit();
  const values = []; const subscription = component.filteredList$.subscribe(value => values.push(value)); t.after(() => subscription.unsubscribe());
  component.searchTermFormControl.setValue('abc'); await wait(); assert.equal(requests[0].term, 'abc');
  requests[0].request.next([{key:'a',label:'A'}, {key:'b',label:'B'}]); assert.deepEqual(values.at(-1).map(item => item.key), ['b']);
  component.singleMode = true; component.searchTermFormControl.setValue('abcd'); await wait();
  requests[1].request.next([{key:'a',label:'A'}, {key:'b',label:'B'}]); assert.deepEqual(values.at(-1).map(item => item.key), ['a', 'b']);
});

test('work-type parent maps services and adds or removes unique selections', () => {
  const component = new FindWorkTypeComponent(); let resets = 0;
  component.field = { name:'workTypes', options:[], minSelected:0, maxSelected:2, type:'find-work-type', findLocationField:'services' };
  component.fields = [{ name:'services', options:[{key:'services_all',label:'All'},{key:'ia',label:'IA'},{key:'sscs',label:'SSCS'}], minSelected:0, maxSelected:3, type:'checkbox' }];
  component.form = new FormGroup({ workTypes: new FormArray([]) }); component.searchWorkTypeComponent = searchComponent({ resetSearchTerm() { resets++; } });
  component.services = /** @type {string[]} */ (/** @type {unknown} */ ([true, true, false])); assert.equal(component.serviceIds, 'ia');
  const choice = {key:'a',label:'A'}; component.onWorkTypeSelected(choice); component.addWorkType();
  assert.deepEqual(component.form.get('workTypes').value, [choice]); assert.equal(resets, 1);
  component.onWorkTypeSelected(choice); component.addWorkType(); assert.deepEqual(component.form.get('workTypes').value, [choice]);
  component.removeWorkType(choice); assert.deepEqual(component.form.get('workTypes').value, []);
});

test('work-type parent single selection and submit respect subscription lifecycle', () => {
  const component = new FindWorkTypeComponent(); let resets = 0; const submit = new Subject();
  component.field = { name:'workTypes', options:[], minSelected:0, maxSelected:1, type:'find-work-type' };
  component.form = new FormGroup({ workTypes: new FormArray([new FormControl({key:'old',label:'Old'})]) });
  component.searchWorkTypeComponent = searchComponent({ resetSearchTerm() { resets++; } }); component.formSubmissionEvent$ = submit; component.ngOnInit();
  const choice = {key:'new',label:'New'}; component.onWorkTypeSelected(choice);
  assert.deepEqual(component.form.get('workTypes').value, [choice]); submit.next(); assert.equal(resets, 0);
  component.onInputChanged('typed'); assert.deepEqual(component.form.get('workTypes').value, []);
  submit.next(); assert.equal(resets, 1); component.ngOnDestroy(); submit.next(); assert.equal(resets, 1);
});

test('task-name uses the cached result for an unaffected service after incompatible data', async t => {
  const { TaskService } = await import('@hmcts/rpx-xui-core-lib/ui/task-data');
  const flat = JSON.stringify([{taskId:1,taskName:'Flat'}]); const validB = JSON.stringify([task('B cached')]);
  const values = new Map([['IA-taskNames', flat], ['B-taskNames', validB]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const requests = [];
  const service = new TaskService(/** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ ({ post(_url, body) { const request = new Subject(); requests.push({body, request}); return request; } })), /** @type {import('@hmcts/rpx-xui-core-lib/browser/session-storage').SessionStorageService} */ (/** @type {unknown} */ (storage)));
  const component = new FindTaskNameComponent(detector, service); component.ngOnInit(); t.after(() => component.ngOnDestroy());
  component.findTaskNameControl.setValue('first'); await wait(); assert.equal(component.lookupFailed, true);
  component.services = 'B'; component.findTaskNameControl.setValue('B'); await wait();
  assert.equal(requests.length, 0); assert.equal(component.filteredOptions[0].task_type.task_type_name, 'B cached');
  component.services = 'IA'; component.findTaskNameControl.setValue('retry'); await wait();
  assert.equal(requests.length, 1); assert.equal(requests[0].body.service, 'IA'); requests[0].request.next([task('retry')]);
  assert.equal(component.lookupFailed, false); assert.equal(values.get('IA-taskNames'), flat); assert.equal(values.get('B-taskNames'), validB);
});

test('task-name setting the same service preserves an active lookup', async t => {
  const requests = []; const component = new FindTaskNameComponent(detector, taskService({ getTaskName() { const request = new Subject(); requests.push(request); return request; } }));
  component.ngOnInit(); t.after(() => component.ngOnDestroy()); component.findTaskNameControl.setValue('alpha'); await wait();
  component.services = 'IA'; requests[0].next([task('alpha')]);
  assert.equal(component.filteredOptions[0].task_type.task_type_name, 'alpha');
});

test('uncached task-name request uses the same endpoint and leaves storage untouched', async () => {
  const { TaskService } = await import('@hmcts/rpx-xui-core-lib/ui/task-data');
  const { firstValueFrom, of, throwError } = await import('rxjs');
  const failure = new Error('synthetic network error'); const calls = [];
  const storage = { getItem() { assert.fail('unexpected cache read'); }, setItem() { assert.fail('unexpected cache write'); }, removeItem() { assert.fail('unexpected cache removal'); } };
  let fail = false;
  const service = new TaskService(/** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ ({ post(url, body) { calls.push({url, body}); return fail ? throwError(() => failure) : of([task('Result')]); } })), /** @type {import('@hmcts/rpx-xui-core-lib/browser/session-storage').SessionStorageService} */ (/** @type {unknown} */ (storage)));
  assert.deepEqual(await firstValueFrom(service.getTaskNameUncached('IA')), [task('Result')]);
  assert.deepEqual(calls[0], {url:'/workallocation/taskNames', body:{service:'IA'}});
  fail = true; await assert.rejects(firstValueFrom(service.getTaskNameUncached('B')), error => error === failure);
  assert.deepEqual(calls[1], {url:'/workallocation/taskNames', body:{service:'B'}});
});
