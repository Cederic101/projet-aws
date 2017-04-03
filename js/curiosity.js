var table = document.querySelector('#jeu');  

var tableau = [];

function init(tabBin,pal)
{
	table.innerHTML = '';
	for(var i=0;i<6;i++)
	{
		tableau[i] = [];
		var tr = document.createElement('tr');
		for(var j=0;j<6;j++)
		{
			var td = document.createElement('td');
			td.setAttribute("id","jeu_td");
			td.setAttribute("data-column",j);
			td.setAttribute("data-row",i);
			switch(pal%5)
			{
				case 1:
					td.style.backgroundColor = "black";
					break;
				case 2:
					td.style.backgroundColor = "blue";
					break;	
				case 3:
					td.style.backgroundColor = "purple";
					break;	
				case 4:
					td.style.backgroundColor = "red";
					break;
				default:
					td.style.backgroundColor = "grey";
					break;
			}
			tableau[i][j] = td;
			if(tabBin[i][j] == 1)
				tableau[i][j].className = '';
			else
			{
				tableau[i][j].className = 'empty';
				tableau[i][j].style.backgroundColor = "white";
			}
			tr.appendChild(td);
		}
		tr.setAttribute("id","jeu_tr");
		table.setAttribute("id","jeu_table");
		table.appendChild(tr);
	}
}

function userList(user_connectes,score_user_connectes)
{
	var list = document.querySelector('#userList');
	list.innerHTML='';
	var ul = document.createElement('ul');
	for(var i=0;i<user_connectes.length;i++)
	{
		var li = document.createElement('li');
		li.innerHTML=user_connectes[i]+" : "+score_user_connectes[i];
		ul.appendChild(li);
	}
	list.appendChild(ul);
}

var ws = new WebSocket('ws://' + window.location.host)

ws.addEventListener('open', function(e) {
    console.log('WS connection by', e.name);
});

ws.addEventListener('message', function(e) 
{
	var data = JSON.parse(e['data']);
	if(data['fin'] == 1)
	{
		location.replace(document.location.origin+"/fin");
	}
	else
	{
		init(data['tab'],data['pal']);
		userList(data['user_connect'],data['score_user_connect']);
	}
	
});

document.querySelector('#jeu').addEventListener('click', function(e) 
{
	ws.send(JSON.stringify({
				'row' : e.target.dataset.row,
				'column' : e.target.dataset.column,
                'user' : document.getElementById('div_jeu').getAttribute("value"),
                'action' : 'play'
    }));
}, true);


