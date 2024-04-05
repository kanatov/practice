"use strict";

class Calculator {
    constructor(domElements, plans) {
        this.dom = domElements;
        this.plans = plans;
        this.monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.prefix = "calc-";
        this.current = {};
        this.getUid = (() => {
            let uid = 0;
            return () => { return uid++; };
        })();

        this.event('init');
    }

    setCurrentPlan(planIndex) {
        this.current.plan = this.plans[planIndex];
    }

    setCurrentDeposit(deposit) {
        const minDeposit = this.current.plan.interestRates[0].minDeposit;
        const maxDeposit = this.current.plan.maxDeposit;

        let newDeposit = deposit || this.current.deposit || 0;
        newDeposit = this.clamp(newDeposit, minDeposit, maxDeposit);

        this.current.deposit = newDeposit;
    }

    clamp(value, min, max) {
        return Math.min(Math.max(min, value), max);
    }

    setCurrentPeriod(period) {
        this.current.period = parseInt(period);
    }

    setCurrentInterest(interest) {
        this.current.interest = interest;
    }

    /*
    // Добавляем элемент в массив
    add() {
        if (+this.dom.summ.value > 0) {
            var newDate = new Date(this.dom.date.datepicker('getDate'));
            this.arr.push({ 'summ': +this.dom.summ.value, 'date': newDate });
            
            this.arr.sort(function (a, b) {
                return b.date - a.date;
            });
            
            this.dom.summ.value = '1500';
            
            this.init();
        } else {
            this.notify(1);
        }
    }
     
    // Удаляем элемент из массива
    remove(n) {
        this.arr.splice(n, 1);
        this.init();
    }
    */
    getTemplate(templateName) {
        const template = this.dom[templateName].content.cloneNode(true);
        const node = template.childNodes[1];
        return node;
    }
    getInterestIndex() {
        const deposit = this.current.deposit;
        const ranges = this.current.depositRanges;
        const index = ranges.findIndex((range) => range.min <= deposit && deposit <= range.max);
        return index;
    }

    getDate(months = 0) {
        let date = new Date();

        if (months) {
            let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            newDate.setMonth(date.getMonth() + months);

            if (date.getDate() != newDate.getDate())
                newDate.setDate(0);

            date = newDate;
        }

        let dateValue = '';
        dateValue += date.getDate();
        dateValue += ' ';
        dateValue += this.monthNames[date.getMonth()];
        dateValue += ' ';
        dateValue += date.getFullYear();

        return dateValue;
    }

    getSavings() {
        let savings = this.current.deposit;
        const periodIndex = this.current.period;
        const periodMonths = this.current.plan.interestRates[periodIndex].period;

        for (let i = 0; i < periodMonths; i++)
            savings += savings * (this.current.interest / 100);
        savings = savings.toFixed(2);

        return savings;
    }

    sanitizeNodes(parent) {
        while (parent.firstChild)
            parent.removeChild(parent.firstChild);
    }

    initDepositRanges() {
        // Refresh interest ranges
        this.current.depositRanges = {};
        const currentRates = this.current.plan.interestRates;
        const ratesDepositsArray = currentRates.map(rate => rate.minDeposit);
        const cap = this.current.plan.maxDeposit;
        let depositRanges = [];

        for (let i = 0; i < currentRates.length; i++) {
            const min = currentRates[i].minDeposit;
            let max;

            if (typeof currentRates[i + 1] !== 'undefined')
                max = currentRates[i + 1].minDeposit - 1;
            const range = {
                min: min,
                max: max
            };
            depositRanges.push(range);
        }

        depositRanges[depositRanges.length - 1].max = cap;
        this.current.depositRanges = depositRanges;

    }

    initPlans() {
        const numberOfPlans = this.plans.length;

        for (let i = 0; i < numberOfPlans; i++) {
            const planName = this.plans[i].name;
            const category = this.plans[i].category;

            //Radiogroup template and values
            const newPlanGroupElement = this.getTemplate('planGroupElement');
            switch (category) {
                case 1:
                    newPlanGroupElement.id = 'planPro';
                    break;

                case 2:
                    newPlanGroupElement.id = 'planPremium';
                    break;

                default:
                    newPlanGroupElement.id = 'planBasic';
            }

            newPlanGroupElement.htmlFor = planName;

            const newPlanGroupElementText = newPlanGroupElement.childNodes[0];
            newPlanGroupElementText.textContent = planName;

            const newPlanGroupElementInput = newPlanGroupElement.childNodes[1];
            newPlanGroupElementInput.id = planName;
            newPlanGroupElementInput.value = i;

            if (i === 0)
                newPlanGroupElementInput.checked = true;

            //Event listener
            newPlanGroupElementInput.addEventListener('change', (e) => {
                const value = e.target.value;
                this.event('plans', value);
            });

            this.dom.planGroup.appendChild(newPlanGroupElement);
        }
    }

    initDeposit() {
        const formDeposit = this.dom.formDeposit;
        formDeposit.addEventListener('change', (e) => {
            const value = e.target.value;
            this.event('deposit input', value);
        });

        const formDepositRange = this.dom.formDepositRange;
        formDepositRange.addEventListener('input', (e) => {
            const value = e.target.value;
            this.event('deposit range', value);
        });
    }

    initPeriods() {
        this.sanitizeNodes(this.dom.periodGroup);

        const numberOfRates = this.current.plan.interestRates.length;

        for (let i = 0; i < numberOfRates; i++) {
            const rate = this.current.plan.interestRates[i];

            if (Object.hasOwn(rate, 'period')) {
                const period = rate.period;
                const id = i;

                //Radiogroup template and values
                const newPeriod = this.getTemplate('periodGroupElement');
                newPeriod.htmlFor = id;

                const newPeriodText = newPeriod.childNodes[0];
                newPeriodText.textContent = period + 'mo';

                const newPeriodInput = newPeriod.childNodes[1];
                newPeriodInput.id = id;
                newPeriodInput.value = id;
                if (i === 0)
                    newPeriodInput.checked = true;

                //Event listener
                newPeriodInput.addEventListener('change', (e) => {
                    const value = e.target.value;
                    this.event('period', value);
                });

                this.dom.periodGroup.appendChild(newPeriod);
            }
        }
    }

    initSave() {
        const form = this.dom.form;
        form.addEventListener('submit', (e) => {
            this.event('save');
            e.preventDefault();
        });
    }

    updateDepositInput() {
        const formDeposit = this.dom.formDeposit;
        formDeposit.value = this.current.deposit;
    }

    updateDepositRange() {
        const minDeposit = this.current.plan.interestRates[0].minDeposit;
        const maxDeposit = this.current.plan.maxDeposit;

        const formDepositRange = this.dom.formDepositRange;
        formDepositRange.min = minDeposit;
        formDepositRange.max = maxDeposit;
        formDepositRange.value = this.current.deposit;
    }

    updateDepositMinMax() {
        const minDeposit = this.current.plan.interestRates[0].minDeposit;
        const maxDeposit = this.current.plan.maxDeposit;

        const formDepositMin = this.dom.formDepositMin;
        formDepositMin.textContent = minDeposit;

        const formDepositMax = this.dom.formDepositMax;
        formDepositMax.textContent = maxDeposit;
    }

    updateInterest() {
        const planIndex = this.getInterestIndex();
        const periodIndex = this.current.period;

        // get bigger index
        const index = Math.max(planIndex, periodIndex);
        const rates = this.current.plan.interestRates;
        this.current.interest = rates[index].rate;

        // Assigning rate
        const formPercent = this.dom.formPercent;
        const interestValue = this.current.interest + '%';
        formPercent.textContent = interestValue;
    }

    updateResults() {
        const resultFromDate = this.dom.resultFromDate;
        resultFromDate.textContent = this.getDate();

        const periodIndex = this.current.period;
        const periodMonths = this.current.plan.interestRates[periodIndex].period;
        const resultToDate = this.dom.resultToDate;
        resultToDate.textContent = this.getDate(periodMonths);

        const resultSavings = this.dom.resultSavings;
        resultSavings.textContent = this.getSavings();

        const resultInterest = this.dom.resultInterest;
        const interest = (this.getSavings() - this.current.deposit).toFixed(2);
        resultInterest.textContent = interest;
    }

    save() {
        const newSave = this.getTemplate('savedResultElement');
        const id = this.prefix + this.getUid();
        newSave.id = id;

        //Event listener
        const newSaveClose = newSave.getElementsByClassName("delete")[0];
        newSaveClose.addEventListener('click', (e) => {
            e.preventDefault();
            this.event('delete', id);
        });

        this.dom.savedResults.appendChild(newSave);
    }

    delete(id) {
        const elem = document.getElementById(id);
        this.dom.savedResults.removeChild(elem);
    }

    event(event, value) {
        switch (event) {
            case 'init':
                this.initPlans();
                this.initDeposit();
                this.initSave();
                this.event('plans', 0);
                this.updateResults();
                break;
            case 'plans':
                this.setCurrentPlan(value);
                this.setCurrentDeposit();
                this.initDepositRanges();
                this.setCurrentPeriod(0);
                this.updateDepositInput();
                this.updateDepositRange();
                this.updateDepositMinMax();
                this.initPeriods();
                this.updateInterest();
                this.updateResults();
                break;
            case 'deposit input':
                this.setCurrentDeposit(value);
                this.updateDepositRange();
                this.updateInterest();
                this.updateResults();
                break;
            case 'deposit range':
                this.setCurrentDeposit(value);
                this.updateDepositInput();
                this.updateInterest();
                this.updateResults();
                break;
            case 'period':
                this.setCurrentPeriod(value);
                this.updateInterest();
                this.updateResults();
                break;
            case 'save':
                this.save();
                break;
            case 'delete':
                this.delete(value);
                break;
        }
    }
}
