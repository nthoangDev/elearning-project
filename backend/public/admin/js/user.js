document.addEventListener('DOMContentLoaded', () => {
    // Form Change Multi Instructor
    const form = document.querySelector('form[form-change-multi]');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        const wrap = document.querySelector('[checkbox-multi]');
        const checked = wrap ? wrap.querySelectorAll("input[name='ids']:checked") : [];

        if (!checked || checked.length === 0) {
            e.preventDefault();
            alert('Vui lòng chọn ít nhất một bản ghi!');
            return;
        }

        const ids = Array.from(checked).map(inp => inp.value);
        let inputIds = form.querySelector("input[name='inputIds']");
        if (!inputIds) {
            inputIds = document.createElement('input');
            inputIds.type = 'hidden';
            inputIds.name = 'inputIds';
            form.appendChild(inputIds);
        }
        inputIds.value = ids.join(',');
    });

    // Change status
    const changeForm = document.querySelector("#form-change-status");
    if (changeForm){
        const STATUS = ['ACTIVE','INACTIVE','LOCKED'];

        document.querySelectorAll(".button-change-status").forEach(btn =>{
            btn.addEventListener('click', () =>{
                const id = btn.dataset.id;
                if (!id) return;
                
                const current = btn.dataset.current || "INACTIVE";
                const idx = STATUS.indexOf(current);
                nextStatus = STATUS[(idx +1) % STATUS.length];

                changeForm.action = `${changeForm.dataset.path}/${id}/status?_method=PATCH`;
                let input = changeForm.querySelector("#input-hidden-status");
                if (!input){
                    input = document.createElement("input");
                    input.type = "hidden";
                    input.name = "status";
                    changeForm.appendChild(input);
                }
                input.value = nextStatus;
                changeForm.submit();
            });
        });
    
    }



});