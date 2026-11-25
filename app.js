'use strict';

const BASE_DAILY = 25000n;
const LODGING_LIMIT = { seoul: 100000n, metro: 80000n, other: 70000n };
const DAY_MS = 86400000;
const FARE_EXEMPT = ['officialCar', 'official', 'none'];
const won = new Intl.NumberFormat('ko-KR');

function formatWon(amount) {
  return `${won.format(amount)}원`;
}

function travelDays(departure, returnDate) {
  const first = Date.parse(`${departure}T00:00:00Z`);
  const last = Date.parse(`${returnDate}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return 0;
  return (last - first) / DAY_MS + 1;
}

function lowerAmount(first, second) {
  return first < second ? first : second;
}

function calculateTrip(trip) {
  const days = travelDays(trip.departure, trip.returnDate);
  if (!days) throw new Error('복귀일은 출장일과 같거나 그 이후여야 합니다.');

  if (trip.tripType === 'inside') {
    const duration = trip.hours * 60 + trip.minutes;
    if (duration <= 0) throw new Error('실제 출장 시간과 분을 입력하세요.');
    if (duration > days * 24 * 60) throw new Error('출장 시간이 입력한 날짜 범위를 초과합니다.');
    const base = duration >= 240 ? 20000n : 10000n;
    const reduction = trip.localVehicle === 'assigned' ? base : trip.localVehicle === 'reduction' ? 10000n : 0n;
    const vehicleDetail = {
      assigned: '전용 차량 배정으로 기본액 전액 차감',
      reduction: '공무용 차량 이용 등으로 10,000원 차감',
      regular: '일반 지급으로 차량 감액 없음',
    };
    return {
      description: `근무지 내 출장 · ${trip.hours}시간 ${trip.minutes}분`,
      items: [
        ['출장 기본액', base, [`실제 출장 ${trip.hours}시간 ${trip.minutes}분 · 4시간 ${duration >= 240 ? '이상' : '미만'} 기준`]],
        ['차량 적용 감액', -reduction, [vehicleDetail[trip.localVehicle]]],
      ],
    };
  }

  if (!trip.payClass) throw new Error('여비 지급 구분을 선택하세요.');
  if (trip.mealDays > days) throw new Error('식비 지급 대상 일수는 전체 여행일수를 넘을 수 없습니다.');
  if (trip.longStayDays >= days) throw new Error('장기체재 일수는 도착일을 제외한 여행일수 범위에서 입력하세요.');
  const nights = trip.stays.reduce((count, stay) => count + stay.nights, 0);
  if (nights >= days) throw new Error('숙박 박수는 여행일수에서 1을 뺀 값까지 입력할 수 있습니다.');

  const fare = FARE_EXEMPT.includes(trip.transport) ? 0n : trip.fare;
  const special = trip.payClass === 'special';
  const fullDaily = special ? trip.actualDaily : BASE_DAILY * BigInt(days);
  const daily = trip.halfDaily ? fullDaily / 2n : fullDaily;
  const discountedPeriods = [
    [Math.max(0, Math.min(trip.longStayDays, 30) - 15), 10],
    [Math.max(0, Math.min(trip.longStayDays, 60) - 30), 20],
    [Math.max(0, trip.longStayDays - 60), 30],
  ];
  const dailyRate = daily / BigInt(days);
  const longStayReduction = special ? 0n : discountedPeriods.reduce((total, [count, percent]) =>
    total + dailyRate * BigInt(count * percent) / 100n, 0n);
  const meals = special ? trip.actualMeals : BASE_DAILY * BigInt(trip.mealDays);
  const lodgingEntries = trip.stays.map(stay => {
    const limit = LODGING_LIMIT[stay.region];
    const ceiling = trip.extraLodging ? limit * 13n / 10n : limit;
    const perNight = trip.payClass === '2' ? lowerAmount(stay.rate, ceiling) : stay.rate;
    const amount = perNight * BigInt(stay.nights);
    const ceilingDetail = trip.payClass === '2'
      ? ` · 1박 상한 ${formatWon(ceiling)}${trip.extraLodging ? ' (30% 추가 한도 적용)' : ''}` : '';
    return {
      amount,
      detail: `${stay.regionLabel} · 입력 1박 ${formatWon(stay.rate)}${ceilingDetail} · 지급 1박 ${formatWon(perNight)} × ${stay.nights}박 = ${formatWon(amount)}`,
    };
  });
  const lodging = lodgingEntries.reduce((total, stay) => total + stay.amount, 0n);
  const mileageBasis = daily - longStayReduction;
  const mileage = lowerAmount(mileageBasis / 2n, trip.mileageSavings);

  const fareDetail = trip.transport === 'none' ? '청구 운임 없음'
    : FARE_EXEMPT.includes(trip.transport) ? '공용 교통수단 이용으로 운임 미지급'
    : `입력한 지급 대상 운임 ${formatWon(fare)}`;
  const dailyBasis = special ? `입력 실비 ${formatWon(fullDaily)}` : `${formatWon(BASE_DAILY)} × ${days}일`;
  const dailyDetail = `${dailyBasis}${trip.halfDaily ? ' × 50%' : ''} = ${formatWon(daily)}`;
  const mealDetail = special ? `입력 실비 ${formatWon(meals)}`
    : `${formatWon(BASE_DAILY)} × 지급 대상 ${trip.mealDays}일 = ${formatWon(meals)}`;

  const items = [['교통 운임', fare, [fareDetail]], [trip.halfDaily ? '일비 (50% 지급)' : '일비', daily, [dailyDetail]]];
  if (longStayReduction > 0n) {
    const details = discountedPeriods.filter(([count]) => count > 0).map(([count, percent]) =>
      `${formatWon(dailyRate)} × ${count}일 × ${percent}%`);
    items.push(['장기체재 일비 감액', -longStayReduction, [`동일 지역 체재 ${trip.longStayDays}일`, ...details]]);
  }
  if (trip.mileageSavings > 0n) {
    items.push(['공적 항공마일리지 추가 일비', mileage, [
      `감액 반영 일비 ${formatWon(mileageBasis)}의 50%와 절약 운임 ${formatWon(trip.mileageSavings)} 중 낮은 금액`,
    ]]);
  }
  const lodgingDetails = lodgingEntries.length ? lodgingEntries.map(stay => stay.detail) : ['입력한 숙박 내역 없음'];
  items.push(['숙박비', lodging, lodgingDetails], ['식비', meals, [mealDetail]]);
  return { description: `근무지 외 출장 · ${days}일 · 실제 숙박 ${nights}박`, items };
}

const form = document.querySelector('#trip-form');
const fields = form.elements;
const stays = document.querySelector('#stays');
const adjustments = document.querySelector('#adjustments');
const error = document.querySelector('#form-error');
const breakdown = document.querySelector('#breakdown');
const breakdownItems = document.querySelector('#breakdown-items');
const resultTotal = document.querySelector('#result-total');
const resultStatus = document.querySelector('#result-status');
const resultDetails = document.querySelector('#result-details');
const resultPeriod = document.querySelector('#result-period');
const resultConditions = document.querySelector('#result-conditions');
const printResult = document.querySelector('#print-result');
const resultActions = document.querySelector('#result-actions');
const saveExcel = document.querySelector('#save-excel');
const exportError = document.querySelector('#export-error');
const dateSummary = document.querySelector('#date-summary');
const userGuide = document.querySelector('#user-guide');
let currentResult = null;

document.querySelector('#open-guide').addEventListener('click', () => {
  userGuide.showModal();
});

function showFields(selector, visible) {
  const container = document.querySelector(selector);
  container.hidden = !visible;
  container.querySelectorAll('input, select, button').forEach(control => { control.disabled = !visible; });
}

function updateForm() {
  const inside = fields.tripType.value === 'inside';
  const special = fields.payClass.value === 'special';
  const transport = fields.transport.value;
  const fareVisible = !inside && !FARE_EXEMPT.includes(transport);
  const mixedOrAir = ['air', 'other'].includes(transport);
  const mealsNeedInput = !inside && !special && ['air', 'ship'].includes(transport);
  const lodgingHint = document.querySelector('#lodging-hint');

  showFields('#inside', inside);
  showFields('#outside', !inside);
  showFields('#fare-group', fareVisible);
  showFields('#half-daily-group', !inside && transport !== 'officialCar');
  showFields('#official-car-hint', !inside && transport === 'officialCar');
  showFields('#special-amounts', !inside && special);
  showFields('#lodging', !inside);
  showFields('#lodging-overage', !inside && fields.payClass.value === '2');
  showFields('#adjustments', !inside);
  showFields('#meal-group', !inside && !special);
  showFields('#meal-hint', !inside && !special);
  showFields('#long-stay-group', !inside && !special);
  showFields('#long-stay-hint', !inside && !special);
  showFields('#mileage-group', !inside && mixedOrAir);
  showFields('#mileage-hint', !inside && mixedOrAir);
  fields.fare.required = fareVisible;
  fields.actualDaily.required = !inside && special;
  fields.actualMeals.required = !inside && special;
  if (mealsNeedInput && !fields.mealDays.required) adjustments.open = true;
  fields.mealDays.required = mealsNeedInput;
  fields.mealDays.placeholder = mealsNeedInput ? '해당 없으면 0' : '비워 두면 전체 여행일수';
  fields.returnDate.min = fields.departure.value;

  const fareHint = {
    rail: fields.payClass.value === '2' ? '일반실 기준으로 할인을 반영한 금액을 입력하세요.' : '지급 구분에 맞는 철도 등급과 할인을 반영하세요. 제1호는 특실 기준입니다.',
    ship: fields.payClass.value === '2' ? '2등급 기준으로 할인을 반영한 금액을 입력하세요.' : '지급 구분에 맞는 선박 등급과 할인을 반영하세요. 제1호는 1등급 기준입니다.',
    bus: '적용되는 버스 요금에서 할인을 반영한 금액을 입력하세요.',
    car: '해당 철도·버스 운임을 입력하세요. 공무상 부득이하게 자가용을 이용한 경우에는 기관 기준에 따른 연료비·통행료 등을 입력하세요.',
    air: '적용 등급과 할인, 마일리지 사용 시 지급할 운임까지 반영한 금액을 입력하세요.',
    other: '각 수단의 지급 기준과 할인 등을 반영한 총운임을 입력하세요. 공용으로 이용한 구간의 운임은 빼세요.',
  };
  document.querySelector('#fare-hint').textContent = fareHint[transport] ?? '';
  lodgingHint.textContent = ['air', 'ship', 'other'].includes(transport)
    ? '수로·항공 이동 중에는 부득이하게 육지에서 숙박한 경우에만 입력하세요. 출장지 숙박은 실제 숙박한 밤과 할인 적용 요금을 입력하세요.'
    : '실제 숙박한 밤과 할인 적용 요금을 입력하세요. 지역이나 1박 요금이 다르면 행을 추가하세요.';

  const days = travelDays(fields.departure.value, fields.returnDate.value);
  if (days) {
    dateSummary.textContent = `입력한 여행기간 ${days}일 (출장일과 복귀일 포함)`;
  } else if (fields.departure.value && fields.returnDate.value) {
    dateSummary.textContent = '복귀일은 출장일과 같거나 그 이후여야 합니다.';
  } else {
    dateSummary.textContent = '출장에 실제로 필요한 기간을 입력하세요.';
  }
}

function readTrip() {
  const get = name => fields[name].value;
  const money = input => input.disabled || !input.value ? 0n : BigInt(input.valueAsNumber);
  return {
    tripType: get('tripType'), departure: get('departure'), returnDate: get('returnDate'),
    hours: Number(get('hours')), minutes: Number(get('minutes')), localVehicle: get('localVehicle'),
    payClass: get('payClass'), transport: get('transport'), fare: money(fields.fare),
    halfDaily: get('transport') === 'officialCar' || fields.halfDaily.checked,
    actualDaily: money(fields.actualDaily), actualMeals: money(fields.actualMeals),
    mealDays: fields.mealDays.disabled || get('mealDays') === ''
      ? travelDays(get('departure'), get('returnDate')) : Number(get('mealDays')),
    longStayDays: fields.longStayDays.disabled ? 0 : Number(get('longStayDays')),
    mileageSavings: money(fields.mileageSavings),
    extraLodging: !fields.extraLodging.disabled && fields.extraLodging.checked,
    stays: Array.from(stays.children, row => {
      const region = row.querySelector('[data-stay="region"]');
      return {
        region: region.value, regionLabel: region.selectedOptions[0].textContent,
        nights: Number(row.querySelector('[data-stay="nights"]').value),
        rate: money(row.querySelector('[data-stay="rate"]')),
      };
    }),
  };
}

function clearResult() {
  error.hidden = true;
  exportError.hidden = true;
  currentResult = null;
  if (breakdown.hidden) return;
  breakdown.hidden = true;
  resultDetails.hidden = true;
  resultActions.hidden = true;
  resultTotal.textContent = '—';
  resultStatus.textContent = '조건이 변경되었습니다. 다시 계산하세요.';
}

form.addEventListener('input', () => {
  updateForm();
  clearResult();
});

document.querySelector('#add-stay').addEventListener('click', () => {
  const row = document.querySelector('#stay-template').content.firstElementChild.cloneNode(true);
  row.querySelector('[data-stay="nights"]').value = 1;
  row.querySelector('.remove-stay').addEventListener('click', () => {
    row.remove();
    clearResult();
    document.querySelector('#add-stay').focus();
  });
  stays.append(row);
  row.querySelector('select').focus();
  clearResult();
});

form.addEventListener('reset', () => {
  stays.replaceChildren();
  adjustments.open = false;
  clearResult();
  resultStatus.textContent = '출장 조건을 입력하고 계산하세요.';
  setTimeout(updateForm, 0);
});

form.addEventListener('invalid', event => {
  if (adjustments.contains(event.target)) adjustments.open = true;
}, true);

printResult.addEventListener('click', () => {
  if (!breakdown.hidden) window.print();
});

saveExcel.addEventListener('click', async () => {
  const snapshot = currentResult;
  if (!snapshot) return;
  exportError.hidden = true;
  saveExcel.disabled = true;
  try {
    const workbook = await createTripWorkbook(snapshot);
    if (currentResult !== snapshot) return;
    const downloadUrl = URL.createObjectURL(workbook);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `출장여비_${snapshot.departure}_${snapshot.returnDate}.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
  } catch {
    if (currentResult === snapshot) {
      exportError.textContent = '엑셀 파일을 저장하지 못했습니다. 다시 시도하세요.';
      exportError.hidden = false;
    }
  } finally {
    saveExcel.disabled = false;
  }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  error.hidden = true;
  try {
    const trip = readTrip();
    const result = calculateTrip(trip);
    const total = result.items.reduce((sum, [, amount]) => sum + amount, 0n);
    breakdownItems.replaceChildren();
    result.items.forEach(([label, amount, details]) => {
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      const term = document.createElement('dt');
      term.textContent = label;
      const value = document.createElement('dd');
      value.textContent = formatWon(amount);
      row.append(term, value);
      const notes = document.createElement('dd');
      notes.className = 'calculation-notes print-only';
      for (const detail of details) {
        const line = document.createElement('span');
        line.textContent = detail;
        notes.append(line);
      }
      row.append(notes);
      breakdownItems.append(row);
    });
    const conditionLabels = trip.tripType === 'inside'
      ? [fields.localVehicle.selectedOptions[0].textContent]
      : [fields.payClass.selectedOptions[0].textContent, fields.transport.selectedOptions[0].textContent];
    if (trip.tripType === 'outside' && trip.extraLodging) conditionLabels.push('숙박비 상한 초과 지급 적용');
    const period = `${trip.departure} ~ ${trip.returnDate}`;
    const conditions = conditionLabels.join(' · ');
    currentResult = { ...result, total, period, conditions, departure: trip.departure, returnDate: trip.returnDate };
    resultStatus.textContent = result.description;
    resultPeriod.textContent = `출장 기간 ${period}`;
    resultConditions.textContent = conditions;
    resultTotal.textContent = formatWon(total);
    resultDetails.hidden = false;
    breakdown.hidden = false;
    resultActions.hidden = false;
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
  }
});

updateForm();
