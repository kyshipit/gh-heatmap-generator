// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 kyshipit

document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('yearInput');
    const heatmap = document.getElementById('heatmap');
    const monthsContainer = document.getElementById('monthsContainer');
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const outputArea = document.getElementById('output');
    const outputContainer = document.querySelector('.output-container');
    const copyBtn = document.getElementById('copyBtn');

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const levelColors = ['l0', 'l1', 'l2', 'l3', 'l4'];
    
    let commitData = JSON.parse(localStorage.getItem('gh-heatmap-data')) || {};

    function populateYears() {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        // 生成前后 5 年的选项
        for (let y = currentYear - 5; y <= currentYear + 5; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            if (y === 2026) option.selected = true; 
            yearSelect.appendChild(option);
        }
    }

    function renderGraph() {
        const year = parseInt(yearSelect.value);
        heatmap.innerHTML = '';
        monthsContainer.innerHTML = '';

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        const oneDay = 24 * 60 * 60 * 1000;
        const totalDays = Math.round((endDate - startDate) / oneDay) + 1;
        const startDayOfWeek = startDate.getDay(); 
        const totalWeeks = Math.ceil((startDayOfWeek + totalDays) / 7);

        const cellSize = 15;
        const cellGap = 4;
        const totalWidth = totalWeeks * (cellSize + cellGap) - cellGap;
        monthsContainer.style.width = `${totalWidth}px`;

        for (let i = 0; i < startDayOfWeek; i++) {
            const blank = document.createElement('div');
            blank.style.visibility = 'hidden';
            heatmap.appendChild(blank);
        }

        let lastMonth = -1;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            const month = d.getMonth();
            
            // --- 替换开始：全新的月份标签居中算法 ---
            let lastEndCol = -1;
            const oneDay = 24 * 60 * 60 * 1000;

            // 直接遍历 12 个月，精准计算每个月的起止位置
            for (let m = 0; m < 12; m++) {
                const firstDayOfMonth = new Date(year, m, 1);
                const lastDayOfMonth = new Date(year, m + 1, 0);
                
                const firstDayOffset = Math.round((firstDayOfMonth - startDate) / oneDay);
                const lastDayOffset = Math.round((lastDayOfMonth - startDate) / oneDay);
                
                // 计算这个月第一天和最后一天所在的列（0索引）
                let startCol = Math.floor((startDayOfWeek + firstDayOffset) / 7);
                let endCol = Math.floor((startDayOfWeek + lastDayOffset) / 7);
                
                // 如果这个月的第一列和上个月的最后列重叠（比如某个月只有 4 周），则顺延一列防止文字重叠
                if (startCol <= lastEndCol) {
                    startCol = lastEndCol + 1;
                }
                // 如果顺延后超出了该月实际范围，强行覆盖
                if (startCol > endCol) {
                    endCol = startCol;
                }
                
                const span = endCol - startCol + 1; // 这个月跨了多少列
                const leftPos = startCol * (cellSize + cellGap); // 左侧起点像素
                const width = span * (cellSize + cellGap) - cellGap; // 总宽度
                
                const label = document.createElement('div');
                label.className = 'month-label';
                label.textContent = monthNames[m];
                label.style.left = `${leftPos}px`;
                label.style.width = `${width}px`; // 让标签宽度撑满这一个月
                
                monthsContainer.appendChild(label);
                lastEndCol = endCol;
            }
            const dayEl = document.createElement('div');
            const count = commitData[dateStr] || 0;
            
            dayEl.className = `day ${levelColors[count]}`;
            dayEl.dataset.date = dateStr;
            dayEl.title = `${dateStr} (${count} commits)`;

            dayEl.addEventListener('click', () => {
                let currentLevel = commitData[dateStr] || 0;
                currentLevel = (currentLevel + 1) % 5;
                commitData[dateStr] = currentLevel;
                
                if (currentLevel === 0) delete commitData[dateStr];

                dayEl.className = `day ${levelColors[currentLevel]}`;
                dayEl.title = `${dateStr} (${currentLevel} commits)`;
                localStorage.setItem('gh-heatmap-data', JSON.stringify(commitData));
            });

            // --- 新增：鼠标右键点击清除 ---
            dayEl.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // 阻止浏览器默认的右键菜单弹出
                
                // 如果这个格子有数据，才执行清空
                if (commitData[dateStr]) {
                    delete commitData[dateStr];
                    
                    // 恢复到 0 级样式
                    dayEl.className = `day ${levelColors[0]}`;
                    dayEl.title = `${dateStr} (0 commits)`;
                    localStorage.setItem('gh-heatmap-data', JSON.stringify(commitData));
                }
            });

            heatmap.appendChild(dayEl);
        }
    }

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function generateBashScript() {
        const dates = Object.keys(commitData).sort();
        if (dates.length === 0) {
            alert("Please select at least one day on the graph.");
            return;
        }

        let script = `#!/bin/bash\n\n`;
        script += `# ---------------------------------------------------------\n`;
        script += `# Auto-generated Bash script for Git timestamp research.\n`;
        script += `# ---------------------------------------------------------\n\n`;
        script += `set -e # Exit on error\n\n`;
        script += `# 1. Initialize repository state\n`;
        script += `touch activity.txt\n`;
        script += `git add activity.txt\n\n`;
        script += `# 2. Define commit generation logic\n`;
        script += `make_commits() {\n`;
        script += `  local date_str="$1"\n`;
        script += `  local count="$2"\n`;
        script += `  local iso_date="\${date_str}T12:00:00"\n\n`;
        script += `  for (( i=1; i<=count; i++ )); do\n`;
        script += `    echo "activity log $date_str-$i" >> activity.txt\n`;
        script += `    git add activity.txt\n`;
        script += `    GIT_AUTHOR_DATE="$iso_date" GIT_COMMITTER_DATE="$iso_date" git commit -m "activity: update for $date_str" -q\n`;
        script += `  done\n`;
        script += `}\n\n`;
        script += `# 3. Execute commits based on user input\n`;

        dates.forEach(date => {
            script += `make_commits "${date}" ${commitData[date]}\n`;
        });

        script += `\n echo "Done! Run 'git push origin main' to sync with GitHub."\n`;

        outputArea.value = script;
        outputContainer.style.display = 'block';
        copyBtn.style.display = 'block';
        outputContainer.scrollIntoView({ behavior: 'smooth' });
    }

    populateYears();
    renderGraph();

    yearSelect.addEventListener('change', renderGraph);
    generateBtn.addEventListener('click', generateBashScript);

    // 清空逻辑
    clearBtn.addEventListener('click', () => {
        // 弹出确认框，防止手滑点错
        if (confirm("Are you sure you want to clear all selections?")) {
            commitData = {}; // 清空内存中的数据
            localStorage.removeItem('gh-heatmap-data'); // 清空本地存储
            renderGraph(); // 重新渲染空白网格
            outputContainer.style.display = 'none'; // 把底部的输出框隐藏掉
        }
    });

    copyBtn.addEventListener('click', () => {
        outputArea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
    });
});