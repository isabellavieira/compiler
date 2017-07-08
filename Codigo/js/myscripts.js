/********************************************************************************
				TP1 | Compiladores | Análise Léxica e Sintática
				    Ciência da Computação | UFSJ | 2015.02
Alunas: Isabella Vieira Ferreira
		Mônica Neli de Resende
**********************************************************************************/

var tabelaLiterais = 0;										// Tabela de tabelaLiterais
var tabelaIdentificadores = 0;								// Tabela de Indentificadores
var tabelaTokens = 0;										// Tabela de tokens
var tabelaConstantes = 0;									// Tabela de Constantes
var tabelaErrosLexicos = 0;								 	// Tabela de erros lexicos
var tabelaErrosSintaticos = 0;								// Tabela de erros sintaticos
var codigoCompilado = "";
var zip = new JSZip();

/***
 * Dicionario contendo os tokens aceitos pelo compilador com seus respectivos códigos 
 * Obs: Quando é identificador o valor é -1, quando é constante o valor é -2
 */
var literais = {'"' : 29, "'" : 30};
var delimitadores = {"{" : 32, "}" : 33, "(" : 34, ")" : 35, ',' : 36, "." : 37};
var atribuicao = {"=" : 2};					
var comentario = {"//" : 1};					
var semicolon = {";" : 31};						
var operadores = {"==" : 3,">" : 4,"<" : 5,">=" : 6,"<=" : 7,"!=" : 8,"&&" : 9,"||" : 10, "!" : 11,"%" : 12,"+" : 13, "-" : 14,"/" : 15, "*" : 16,"^" : 17};
var palavrasReservadas = {"if" : 18, "else" : 19, "continue" : 20, "break" : 21, "while" : 22, "print" : 23, "read" : 24, "int" : 25, "float" : 26, "string" : 27, "char" : 28};

/***
 * author: http://tableless.com.br/file-api-trabalhando-com-arquivos-locais-usando-javascript/
 */
var leitorDeArquivo = new FileReader();
window.onload = function init() {
	leitorDeArquivo.onload = lerArquivo;
}        

/***
 * Função obterArquivo:
 * Lê um arquivo File como texto
 * author: 	http://tableless.com.br/file-api-trabalhando-com-arquivos-locais-usando-javascript/
 */
function obterArquivo(arquivoDeEntrada) {
     var arquivo = arquivoDeEntrada.files[0];
     leitorDeArquivo.readAsText(arquivo);
}

/***
 * Função lerArquivo: exibe as linhas do arquivo em uma tabela após o carregamento.
 * @params: evento (após o carregamento)
 * author: http://tableless.com.br/file-api-trabalhando-com-arquivos-locais-usando-javascript/
 */
function lerArquivo(evento) {
	var arquivo = evento.target.result.split('\n');
	var div = "<table border='0' cellpadding='0' cellspacing='0' class='centered'><td class='gutter' style='    padding-top: 6px!important; padding-left: 6px!important; color: rgb(100, 178, 134)!important;'>";

	for (var i = 0; i < arquivo.length; i++) div = div + "<div class='line number3 index2 alt2' >"+i+"</div>";
	div = div + "</td><td><pre class='language-c'><code class='language-c'>";
	
	for (var i = 0; i < arquivo.length; i++) {
		if (arquivo[i] == '') codeLine = '\n';
		else codeLine = arquivo[i];
		div += "<div class='codeLine' style='    text-align: left;'>"+ codeLine+'</div>';
	}

	div += "</code></pre></td></tr></table>";
	var arquivoSaidaDiv = document.getElementById('arquivoSaida');
	arquivoSaidaDiv.innerHTML = div;
	arquivoSaidaDiv.classList.remove("ocultar-div");

	// Limpar divs
	var h5MessageElement = document.getElementById('tabelaToken');
	h5MessageElement.innerHTML = "";

	var h5MessageElement = document.getElementById('tabelaConst');
	h5MessageElement.innerHTML = "";

	var h5MessageElement = document.getElementById('tabelaLite');
	h5MessageElement.innerHTML = "";

	var h5MessageElement = document.getElementById('tabelaVariaveis');
	h5MessageElement.innerHTML = "";

	var h5MessageElement = document.getElementById('tabelaErrosLexicos');
	h5MessageElement.innerHTML = "";

	var h5MessageElement = document.getElementById('tabelaErrosSintatico');
	h5MessageElement.innerHTML = "";
	
	zip = new JSZip();

	main(arquivo);
}


/***
 * Função isLetter: a função verifica se um caracter é um número ou não
 * author: http://stackoverflow.com/questions/9862761/how-to-check-if-character-is-a-letter-in-javascript
 */
function isLetter(str) {
	return str != undefined && str.match(/[a-z]/i) != null;
}

/***
 * Função isNumeric: a função verifica um caracter é um número ou não
 * author: http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
 */
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/***
 * Função download
 */
function download_tabelas() {
	var content = zip.generate({type:"blob"});
	saveAs(content, "tabelas.zip");
}

/***
 * Função consumirEspacos: Lê os espaços, tabs até o próximo caracter, separador ou número 
 * para ser analisado como token. Atualização das posições dos ponteiros sentinela e lookAhead.
 * @params:	linhaDoArquivo, sentinela, lookAhead
 * author: 	Monica
 */
function consumirEspacos(linhaDoArquivo, sentinela, lookAhead){
	var newSentinela = sentinela.value;
	
	//Consumindo espaços e tabs
	 while ((newSentinela < linhaDoArquivo.length) && (linhaDoArquivo[newSentinela] == " " || linhaDoArquivo[newSentinela] == '\t')){
		 newSentinela++;
	}
	
	//Atualizando os ponteiros sentinela e lookAhead
	if (newSentinela != sentinela.value){
		sentinela.value = newSentinela;
		lookAhead.value = newSentinela + 1;
	
	//Final da linha
	} else if (linhaDoArquivo[newSentinela] == undefined && newSentinela+1 >= linhaDoArquivo.length){
		sentinela.value = newSentinela + 1;
		lookAhead.value = newSentinela + 2;
	}
}

/***
 * Função tratarComentario: insere o comentário na tabela de tokens com a respectiva linha e 
 * coluna no código e -1 pois não referencia outra tabela(literais, constantes ou identificadores)
 * @params: tabelaTokens (tabela com todos os tokens - tabela única)
 * 			linhaDoArquivo (string com a linha do arquivo sendo analisada)
 * 			sentinela (coluna da linha do código, após o último token)
 * 			lookAhead (coluna do caracter analisado)
 * 			linhaAtual (linha do arquivo de entrada - código - sendo analisado)
 * author: Monica
 */
function tratarComentario (tabelaTokens, linhaDoArquivo, sentinela, lookAhead, linhaAtual) {
	var idDelimitador = comentario["//"];
	
	inserirTabelaTokens(tabelaTokens, idDelimitador, linhaAtual, sentinela.value, -1);
	lookAhead.value = linhaDoArquivo.length;
	sentinela.value = lookAhead.value;
}

/***
 * Insere delimitador na tabela de tokens
 * author: Isabella
 */
function tratarDelimitadores (tabelaTokens, arquivoLinhaAtual, linhaAtual, sentinela, lookAhead) {
	var idDelimitador;

	var valor = Object.keys(delimitadores).map(function(key){
    	idDelimitador = delimitadores[arquivoLinhaAtual[sentinela.value]];
	});

	inserirTabelaTokens(tabelaTokens, idDelimitador, linhaAtual, sentinela.value, -1);
	sentinela.value = lookAhead.value;
	lookAhead.value = lookAhead.value + 1;
	consumirEspacos(arquivoLinhaAtual, sentinela, lookAhead);
}

/***
 * Insere atribuicao na tabela de tokens
 * author: Isabella
 */
function tratarAtribuicao (tabelaTokens, arquivoLinhaAtual, linhaAtual, sentinela, lookAhead) {
	var idDelimitador;

	var valor = Object.keys(atribuicao).map(function(key){
    	idDelimitador = atribuicao[arquivoLinhaAtual[sentinela.value]];
	});
	
	inserirTabelaTokens(tabelaTokens, idDelimitador, linhaAtual, sentinela.value, -1);
	sentinela.value = lookAhead.value;
	lookAhead.value = lookAhead.value + 1;
	consumirEspacos(arquivoLinhaAtual, sentinela, lookAhead);
}

/***
 * Funcao tratarLiteral: verifica se é um char ou string. Concatena até encontrar as aspas que fecham a string.
 * author: Isabella
 */
function tratarLiteral (tabelaTokens, tabelaLiterais, tabelaErrosLexicos, arquivoLinhaAtual, sentinela, lookAhead, linhaAtual) {
	var string = "";
	var retorno = new Array();
	var idLiteralCaracter;
	var descricaoErro;
	
	// char
	if (arquivoLinhaAtual[sentinela.value] == "'") {
		string = string.concat(arquivoLinhaAtual[lookAhead.value]);
		lookAhead.value = lookAhead.value + 1;
	
	// string
	} else {
		while ((arquivoLinhaAtual[lookAhead.value] != arquivoLinhaAtual[sentinela.value]) && 
		(lookAhead.value < arquivoLinhaAtual.length)) {
			string = string.concat(arquivoLinhaAtual[lookAhead.value]);
			lookAhead.value = lookAhead.value + 1;
		}
	}
	
	// Se fechou as aspas
	if (arquivoLinhaAtual[lookAhead.value] == arquivoLinhaAtual[sentinela.value]) {
		idLiteralCaracter = literais[arquivoLinhaAtual[sentinela.value]];
		var idLinha = inserirTabelaLiterais(tabelaLiterais, string, linhaAtual, sentinela.value);
		inserirTabelaTokens (tabelaTokens, idLiteralCaracter, linhaAtual, sentinela.value, idLinha); 	
		
		sentinela.value = lookAhead.value + 1;
		lookAhead.value = lookAhead.value + 2;
		consumirEspacos(arquivoLinhaAtual, sentinela, lookAhead);
	
	//erro não fechou aspas
	} else {	
		if (arquivoLinhaAtual[sentinela.value] == "'"){
			descricaoErro = "Tem algo errado com esse char... Aspas sem fechar ou mais de um caracter?!";
			
			//Até encontrar separador
			while (isLetter(arquivoLinhaAtual[lookAhead.value]) || isNumeric(arquivoLinhaAtual[lookAhead.value]) || arquivoLinhaAtual[lookAhead.value] == "'") {
				lookAhead.value = lookAhead.value + 1;
			}
		} else {
			descricaoErro = "Programador que é bom não esquece de fechar as aspas! #FicaADica";
			lookAhead.value = arquivoLinhaAtual.length;
		}
		
		inserirtabelaErros(tabelaErrosLexicos, descricaoErro, linhaAtual, sentinela.value);

		sentinela.value = lookAhead.value;
		lookAhead.value = lookAhead.value + 1;
	}
}

/***
 * Insere semicolon na tabela de tokens
 * author: Isabella
 */
function tratarSemicolon (tabelaTokens, arquivoLinhaAtual, linhaAtual, sentinela, lookAhead) {
	var idDelimitador;

	var valor = Object.keys(semicolon).map(function(key){
    	idDelimitador = semicolon[arquivoLinhaAtual];
	});

	inserirTabelaTokens(tabelaTokens, idDelimitador, linhaAtual, sentinela.value, -1);
	sentinela.value = lookAhead.value;
	lookAhead.value = lookAhead.value + 1;
	consumirEspacos(arquivoLinhaAtual, sentinela, lookAhead);
}

/***
 * Função tratarOperadores: insere um operador token na tabela de tokens(tabela única)
 * @params: tabelaTokens, linhaDoArquivo, sentinela, lookAhead, linhaAtual
 * author:  Monica
 */
function tratarOperadores (tabelaTokens, linhaDoArquivo, sentinela, lookAhead, linhaAtual) {
	var operador = 	linhaDoArquivo[sentinela.value] + linhaDoArquivo[lookAhead.value];
	var idDelimitador;
	
	//Operador de dois caracteres
	if (operadores[operador] != undefined){
		idDelimitador = operadores[operador];
		lookAhead.value = lookAhead.value + 1;
	
	//Apenas o primeiro caracter é um operador
	} else if (operadores[linhaDoArquivo[sentinela.value]] != undefined){
		idDelimitador = operadores[linhaDoArquivo[sentinela.value]];
	}
	
	inserirTabelaTokens(tabelaTokens, idDelimitador, linhaAtual, sentinela.value, -1);
	sentinela.value = lookAhead.value;
	lookAhead.value = lookAhead.value + 1;	
	consumirEspacos(linhaDoArquivo, sentinela, lookAhead);
}

/***
 * Função verificaNumero: a função verifica salva o numero na tabela de tokens e constantes
 * author: Isabella e Mônica
 */
function tratarNumero (tabelaTokens, tabelaConstantes, tabelaErrosLexicos, arquivoLinhaAtual, sentinela, lookAhead, linhaAtual) {
	var numero = arquivoLinhaAtual[sentinela.value];
	var erro = false;
	
	while (lookAhead.value < arquivoLinhaAtual.length) {

		if (isNumeric(arquivoLinhaAtual[lookAhead.value]) || arquivoLinhaAtual[lookAhead.value] == ".") {
			numero = numero.concat(arquivoLinhaAtual[lookAhead.value]);
		
		//Separador ou operador
		} else if (!isLetter(arquivoLinhaAtual[lookAhead.value])) {
			break;
		
		//Caracter literal - Erro
		} else {
			
			var descricaoErro = "Número inválido! Você acha que número e letra é a mesma coisa!?";
			inserirtabelaErros (tabelaErrosLexicos, descricaoErro, linhaAtual, sentinela.value);
					
			erro = true;
			break;
		}	
		lookAhead.value = lookAhead.value + 1;
	}

	if (!erro) {
		numero = parseFloat(numero);
		var idLinha = inserirTabelaConstantes(tabelaConstantes, numero, linhaAtual, sentinela.value) ;
		inserirTabelaTokens (tabelaTokens, -2, linhaAtual, sentinela.value, idLinha) ; // id token -> constante = -2
		sentinela.value = lookAhead.value;
		lookAhead.value = lookAhead.value + 1;	
		consumirEspacos(arquivoLinhaAtual, sentinela, lookAhead);	
	} else {	
		while (lookAhead.value < arquivoLinhaAtual.length) {
			
			if (isNumeric(arquivoLinhaAtual[lookAhead.value]) || arquivoLinhaAtual[lookAhead.value] == 
			"." || isLetter(arquivoLinhaAtual[lookAhead.value])) {
				lookAhead.value++;
			
			//Separador ou operador
			} else {
				break;
			}
		}
	
		sentinela.value = lookAhead.value;
		lookAhead.value = sentinela.value + 1;
	}
}

/***
 * 
 * Verifica se e palavra reservada ou variavel ou erro
 * author: Isabella e Monica
 */
function verificarToken (tabelaTokens, tabelaIdentificadores, arquivoLinhaAtual, sentinela, lookAhead, linhaAtual){
	var palavra = arquivoLinhaAtual[sentinela.value];
	var erro = false;

	while (lookAhead.value < arquivoLinhaAtual.length) {

		//Apenas letras, com números ou com underscore
		if (isLetter(arquivoLinhaAtual[lookAhead.value]) ||
			isNumeric(arquivoLinhaAtual[lookAhead.value])|| 
			arquivoLinhaAtual[lookAhead.value] == "_") {
				
			palavra = palavra.concat(arquivoLinhaAtual[lookAhead.value]);
				
		//Separador encontrado
		} else {
			break;
		}
		
		lookAhead.value = lookAhead.value + 1;
	}
	
	//Variável
	if (palavrasReservadas[palavra] == undefined) {
		var idLinha = inserirTabelaIdentificadores (tabelaIdentificadores, palavra, linhaAtual, sentinela.value) ;
		inserirTabelaTokens (tabelaTokens, -1, linhaAtual, sentinela.value, idLinha) ;
	
	//Palavra reservada
	} else {
		var idToken = palavrasReservadas[palavra];
		inserirTabelaTokens (tabelaTokens, idToken, linhaAtual, sentinela.value, -1) ;
	}

	sentinela.value = lookAhead.value;
	lookAhead.value = lookAhead.value + 1;	
}

/***
 * Função criarTabelas: a função inicializa as tabelas do código intermediário para 
 * serem retornadas pelo analisador léxico.
 * @param: tabelaIdentificadores, tabelaDelimitadores, tabelaLiterais, 
 * 		   tabelaTokens, tabelaCodigos, tabelaConstantes
 * author: Isabella e Monica
 */
function criarTabelas(tabelaIdentificadores, tabelaTokens, tabelaLiterais, tabelaConstantes, 
tabelaErrosLexicos) {
	var retorno = new Array();

	// Inicialização da matriz de tabelaIdentificadores
	tabelaIdentificadores = new Array();
	
	// Inicialização da matriz de tabela unica
	tabelaTokens = new Array();

	// Inicialização da matriz de tabelaLiterais
	tabelaLiterais = new Array();
	
	// Inicialização da matriz de constantes
	tabelaConstantes = new Array();
	
	// Inicialização da matriz de erros lexicos
	tabelaErrosLexicos = new Array();
	
	// Inicialização da matriz de erros sintaticos
	tabelaErrosSintaticos = new Array();
	
	retorno[0] = tabelaIdentificadores;
    retorno[1] = tabelaTokens;
    retorno[2] = tabelaLiterais;
    retorno[3] = tabelaConstantes;
    retorno[4] = tabelaErrosLexicos;
    retorno[5] = tabelaErrosSintaticos;

	return retorno;
}

/**
 * Função inserirToken: insere um novo token na tabela unica.
 * @params:	tabelaTokens (tabela unica)
 * 			idToken 	(codigo definido para o token)
 * 			linha 		(linha do token no codigo)
 * 			coluna		(coluna do token no codigo)
 * 			ponteiro 	(ponteiro para a tabela auxiliar referente) == -1 se nao tem tabela referente
 * author: Isabella e Monica
 */
function inserirTabelaTokens(tabelaTokens, idToken, linhaCodigo, colunaCodigo, ponteiro){
	var idLinha = tabelaTokens.length;
	
	tabelaTokens[idLinha] = new Array();
	tabelaTokens[idLinha][0] = idLinha;
	tabelaTokens[idLinha][1] = idToken;
	tabelaTokens[idLinha][2] = linhaCodigo;
	tabelaTokens[idLinha][3] = colunaCodigo;
	tabelaTokens[idLinha][4] = ponteiro;
	
}

/**
 * Função inserirTabelaLiterais: insere um novo token na tabela de literais
 * author: Isabella e Monica
 */
function inserirTabelaLiterais(tabelaLiterais, literal, linhaCodigo, colunaCodigo) {
	var idLinha = tabelaLiterais.length;
	
	tabelaLiterais[idLinha] = new Array();
	tabelaLiterais[idLinha][0] = idLinha;
	tabelaLiterais[idLinha][1] = literal;
	tabelaLiterais[idLinha][2] = linhaCodigo;
	tabelaLiterais[idLinha][3] = colunaCodigo;

	return idLinha;
}

/**
 * Função inserirTabelaIdentificadores: insere um novo token na tabela de identificadores
 * author: Isabella e Monica
 */
function inserirTabelaIdentificadores(tabelaIdentificadores, nomeIdentificador, linhaCodigo, colunaCodigo) {
	var idLinha = tabelaIdentificadores.length;
	var variavel = false;
	var id;
	
	for (var i=0; i<idLinha; i++) {
		if (tabelaIdentificadores[i][1] == nomeIdentificador) {
			variavel = true;
			id = tabelaIdentificadores[i][0];
		}
	}
	
	if (variavel == false) {
		tabelaIdentificadores[idLinha] = new Array();
		tabelaIdentificadores[idLinha][0] = idLinha;
		tabelaIdentificadores[idLinha][1] = nomeIdentificador;
		tabelaIdentificadores[idLinha][2] = linhaCodigo;
		tabelaIdentificadores[idLinha][3] = colunaCodigo;
		//tabelaIdentificadores[idLinha][2] = fkTabelaConstantes;		//Valor da variável 
		return idLinha;
	} else {
		return id;
	}
	
}

/**
 * Função inserirTabelaConstantes: insere um novo token na tabela de constantes
 * author: Isabella e Monica
 */
function inserirTabelaConstantes(tabelaConstantes, constante, linhaCodigo, colunaCodigo) {
	var idLinha = tabelaConstantes.length;
	
	tabelaConstantes[idLinha] = new Array();
	tabelaConstantes[idLinha][0] = idLinha;
	tabelaConstantes[idLinha][1] = constante;
	tabelaConstantes[idLinha][2] = linhaCodigo;
	tabelaConstantes[idLinha][3] = colunaCodigo;	
	//tabelaConstantes[idLinha][2] = fkTabelaIndetificadores;		//Variável referente ao valors
	
	return idLinha;
}


/**
 * Função inserirtabelaErros: insere o erro na tabela de erros
 * author: Isabella e Monica
 */
function inserirtabelaErros(tabelaErros, descricaoErro, linhaCodigo, colunaCodigo) {
	var idLinha = tabelaErros.length;
	
	tabelaErros[idLinha] = new Array();
	tabelaErros[idLinha][0] = idLinha;
	tabelaErros[idLinha][1] = descricaoErro;
	tabelaErros[idLinha][2] = linhaCodigo;
	tabelaErros[idLinha][3] = colunaCodigo;

	return idLinha;
}

/***
 * Função que gera o arquivo texto das tabelas
 */
function gerarArquivoTexto(tabelaTokens, tabelaConstantes, tabelaLiterais, tabelaErrosLexicos, tabelaIdentificadores, tabelaErrosSintaticos) {
	var arquivoTokens = "";
	var arquivoLiterais = "";
	var arquivoConstantes = "";
	var arquivoIdentificadores = "";
	var arquivoErros = "";
	var arquivoErrosSintaticos = "";
	
	if (tabelaErrosLexicos.length > 0) {
		for(var i = 0; i < tabelaErrosLexicos.length; i++) {
			arquivoErros = arquivoErros.concat(tabelaErrosLexicos[i][0] + " ");
			arquivoErros = arquivoErros.concat(tabelaErrosLexicos[i][1] + " ");
			arquivoErros = arquivoErros.concat(tabelaErrosLexicos[i][2] + " ");
			arquivoErros = arquivoErros.concat(tabelaErrosLexicos[i][3] + "\n");
		}
		zip.file("arquivoErrosLexicos.txt", arquivoErros);
	} 

	if (tabelaErrosSintaticos.length > 0) {
		for(var i = 0; i < tabelaErrosSintaticos.length; i++) {
			arquivoErrosSintaticos = arquivoErrosSintaticos.concat(tabelaErrosSintaticos[i][0] + " ");
			arquivoErrosSintaticos = arquivoErrosSintaticos.concat(tabelaErrosSintaticos[i][1] + " ");
			arquivoErrosSintaticos = arquivoErrosSintaticos.concat(tabelaErrosSintaticos[i][2] + " ");
			arquivoErrosSintaticos = arquivoErrosSintaticos.concat(tabelaErrosSintaticos[i][3] + "\n");
		}
		zip.file("arquivoErrosSintaticos.txt", arquivoErrosSintaticos);
	} 

	if (tabelaErrosLexicos.length == 0) {
	
		if (tabelaTokens.length > 0) {
			for(var i = 0; i < tabelaTokens.length; i++) {
				arquivoTokens = arquivoTokens.concat(tabelaTokens[i][0] + " ");
				arquivoTokens = arquivoTokens.concat(tabelaTokens[i][1] + " ");
				arquivoTokens = arquivoTokens.concat(tabelaTokens[i][2] + " ");
				arquivoTokens = arquivoTokens.concat(tabelaTokens[i][3] + " ");
				arquivoTokens = arquivoTokens.concat(tabelaTokens[i][4] + "\n");		
			}	
			
			zip.file("arquivoTokens.txt", arquivoTokens);
		}
		
		if (tabelaLiterais.length > 0) {
			for(var i = 0; i < tabelaLiterais.length; i++) {
				arquivoLiterais = arquivoLiterais.concat(tabelaLiterais[i][0] + " ");
				arquivoLiterais = arquivoLiterais.concat(tabelaLiterais[i][1] + " ");
				arquivoLiterais = arquivoLiterais.concat(tabelaLiterais[i][2] + " ");
				arquivoLiterais = arquivoLiterais.concat(tabelaLiterais[i][3] + "\n");
			}	
			zip.file("arquivoLiterais.txt", arquivoLiterais);
		}
		
		if (tabelaConstantes.length > 0) {
			for(var i = 0; i < tabelaConstantes.length; i++) {
				arquivoConstantes = arquivoConstantes.concat(tabelaConstantes[i][0] + " ");
				arquivoConstantes = arquivoConstantes.concat(tabelaConstantes[i][1] + " ");
				arquivoConstantes = arquivoConstantes.concat(tabelaConstantes[i][2] + " ");
				arquivoConstantes = arquivoConstantes.concat(tabelaConstantes[i][3] + "\n");
			}	
			zip.file("arquivoConstantes.txt", arquivoConstantes);
		}	
		
		if (tabelaIdentificadores.length > 0) {
			for(var i = 0; i < tabelaIdentificadores.length; i++) {
				arquivoIdentificadores = arquivoIdentificadores.concat(tabelaIdentificadores[i][0] + " ");
				arquivoIdentificadores = arquivoIdentificadores.concat(tabelaIdentificadores[i][1] + " ");
				arquivoIdentificadores = arquivoIdentificadores.concat(tabelaIdentificadores[i][2] + " ");
				arquivoIdentificadores = arquivoIdentificadores.concat(tabelaIdentificadores[i][3] + "\n");
			}	
			zip.file("arquivoIdentificadores.txt", arquivoIdentificadores);
		}	
	}
}


/***
 * author: Monica
 */
function exibirTabelas(tabelaTokens, tabelaConstantes, tabelaLiterais, tabelaIdentificadores, 
tabelaErrosLexicos){
	var mensagem = "";
	var classe = "";
	var div = "<h5>Tabela de Tokens</h5>";
	div = div + "<table class='hoverable centered responsive-table'><thead><tr><th>id</th><th>Codigo</th><th>Linha</th><th>Coluna</th><th>id Tabela</th></tr></thead><tbody>";
	
	if (tabelaTokens.length > 0) {
		for(var i = 0; i < tabelaTokens.length; i++) {
			div = div.concat("<tr class='line-hover'>");
			div = div.concat("<td>" + tabelaTokens[i][0] + "</td>");
			div = div.concat("<td>" + tabelaTokens[i][1] + "</td>");
			div = div.concat("<td>" + tabelaTokens[i][2] + "</td>");
			div = div.concat("<td>" + tabelaTokens[i][3] + "</td>");
			div = div.concat("<td>" + tabelaTokens[i][4] + "</td>");		
			div = div.concat("</tr>");
		}	
		div = div + "</tbody></table>";
		var divTabelaTokens = document.getElementById('tabelaToken');
		divTabelaTokens.innerHTML = div;
		divTabelaTokens.classList.remove("ocultar-div");
	}
	
	div = "<h5>Tabela de Constantes</h5>";
	div = div + "<table class='hoverable centered responsive-table'><thead><tr><th>id</th><th>Constante</th><th>Linha</th><th>Coluna</th></tr></thead><tbody>";
	
	if (tabelaConstantes.length > 0) {
		for(var i = 0; i < tabelaConstantes.length; i++) {
			div = div.concat("<tr class='line-hover'>");
			div = div.concat("<td>" + tabelaConstantes[i][0] + "</td>");
			div = div.concat("<td>" + tabelaConstantes[i][1] + "</td>");
			div = div.concat("<td>" + tabelaConstantes[i][2] + "</td>");
			div = div.concat("<td>" + tabelaConstantes[i][3] + "</td>");
			div = div.concat("</tr>");
		}	
		div = div + "</tbody></table>";
		var divTabelaConstantes = document.getElementById('tabelaConst');
		divTabelaConstantes.innerHTML = div;
		divTabelaConstantes.classList.remove("ocultar-div");
	}
	
	div = "<h5>Tabela de Literais</h5>";
	div = div + "<table class='hoverable centered responsive-table'><thead><tr><th>id</th><th>Literal</th><th>Linha</th><th>Coluna</th></tr></thead><tbody>";
	
	if (tabelaLiterais.length > 0) {
		for(var i = 0; i < tabelaLiterais.length; i++) {
			div = div.concat("<tr class='line-hover'>");
			div = div.concat("<td>" + tabelaLiterais[i][0] + "</td>");
			div = div.concat("<td>" + tabelaLiterais[i][1] + "</td>");
			div = div.concat("<td>" + tabelaLiterais[i][2] + "</td>");
			div = div.concat("<td>" + tabelaLiterais[i][3] + "</td>");
			div = div.concat("</tr>");
		}	
		div = div + "</tbody></table>";
		var divTabelaLiterais = document.getElementById('tabelaLite');
		divTabelaLiterais.innerHTML = div;
		divTabelaLiterais.classList.remove("ocultar-div");
	}
	
	div = "<h5>Tabela de Identificadores</h5>";
	div = div + "<table class='hoverable centered responsive-table'><thead><tr><th>id</th><th>Identificador</th><th>Linha</th><th>Coluna</th></tr></thead><tbody>";
	
	if (tabelaIdentificadores.length > 0) {
		for(var i = 0; i < tabelaIdentificadores.length; i++) {
			div = div.concat("<tr class='line-hover'>");
			div = div.concat("<td>" + tabelaIdentificadores[i][0] + "</td>");
			div = div.concat("<td>" + tabelaIdentificadores[i][1] + "</td>");
			div = div.concat("<td>" + tabelaIdentificadores[i][2] + "</td>");
			div = div.concat("<td>" + tabelaIdentificadores[i][3] + "</td>");
			div = div.concat("</tr>");
		}	
		div = div + "</tbody></table>";
		var divTabelaIdentificadores = document.getElementById('tabelaVariaveis');
		divTabelaIdentificadores.innerHTML = div;	
		divTabelaIdentificadores.classList.remove("ocultar-div");		
	}
	
	//div = "<h5>Tabela de Erros Léxicos</h5>";
	div = "";
	div = div + "<table class='hoverable centered responsive-table'><thead><tr><th>id</th><th>Erro</th><th>Linha</th><th>Coluna</th></tr></thead><tbody>";
	
	if (tabelaErrosLexicos.length > 0) {
		for(var i = 0; i < tabelaErrosLexicos.length; i++) {
			div = div.concat("<tr class='line-hover'>");
			div = div.concat("<td>" + tabelaErrosLexicos[i][0] + "</td>");
			div = div.concat("<td>" + tabelaErrosLexicos[i][1] + "</td>");
			div = div.concat("<td>" + tabelaErrosLexicos[i][2] + "</td>");
			div = div.concat("<td>" + tabelaErrosLexicos[i][3] + "</td>");
			div = div.concat("</tr>");
		}	
		div = div + "</tbody></table>";

		var divtabelaErrosLexicos = document.getElementById('tabelaErrosLexicos');
		divtabelaErrosLexicos.innerHTML = div;	
		divtabelaErrosLexicos.classList.remove("ocultar-div");	
		//mensagem = "Ohhh! Seu código possui erros léxicos :(";	
		classe = "flash-fail";
	} else {
		div = "<p>Parabéns! Seu código não possui erros léxicos :)</p>";
		classe = "flash-success";	
		var divtabelaErrosLexicos = document.getElementById('tabelaErrosLexicos');
		divtabelaErrosLexicos.innerHTML = div;	
		divtabelaErrosLexicos.classList.remove("ocultar-div");
	}	

	var spanErrosLexico = document.getElementById('lexico-erros');
	spanErrosLexico.innerHTML = tabelaErrosLexicos.length;		
	spanErrosLexico.classList.add(classe);

	var results = document.getElementById('results-div')
	results.classList.remove("ocultar-div");				
}

function exibirErrosSintaticos(){
	var div = "";
	div = div + "<table class='hoverable centered responsive-table'><thead><tr><th>id</th><th>Erro</th><th>Linha</th><th>Coluna</th></tr></thead><tbody>";
	if (tabelaErrosSintaticos.length > 0){
		
		for(var i = 0; i < tabelaErrosSintaticos.length; i++) {
			div = div.concat("<tr class='line-hover'>");
			div = div.concat("<td>" + tabelaErrosSintaticos[i][0] + "</td>");
			div = div.concat("<td>" + tabelaErrosSintaticos[i][1] + "</td>");
			div = div.concat("<td>" + tabelaErrosSintaticos[i][2] + "</td>");
			div = div.concat("<td>" + tabelaErrosSintaticos[i][3] + "</td>");
			div = div.concat("</tr>");
		}	
		div = div + "</tbody></table>";
		var divtabelaErrosSintatico = document.getElementById('tabelaErrosSintatico');
		divtabelaErrosSintatico.innerHTML = div;	
		divtabelaErrosSintatico.classList.remove("ocultar-div");	
		mensagem = "Ohhh! Seu código possui erros sintáticos :(";	
		classe = "flash-fail";
		
	} else {
		div = "<p>Parabéns! Seu código não possui erros sintáticos :)</p>";
		classe = "flash-success";	
		var divtabelaErrosLexicos = document.getElementById('tabelaErrosSintatico');
		divtabelaErrosLexicos.innerHTML = div;	
		divtabelaErrosLexicos.classList.remove("ocultar-div");
	}		

	var spanErrosSintatico = document.getElementById('sintatico-erros');
	spanErrosSintatico.innerHTML = tabelaErrosSintaticos.length;	
	spanErrosSintatico.classList.add(classe);
}

/***
 * author: Monica
 */
function exibirCodigoCompilado() {
	codigoCompilado = codigoCompilado.concat("</tr></table>");
	var divCodigoCompilado = document.getElementById('codigoCompilado');
	divCodigoCompilado.innerHTML = codigoCompilado;
	divCodigoCompilado.classList.remove("ocultar-div");
}

/***
 * author: Monica
 */
function criarCodigoCompilado(arquivo){
	codigoCompilado = codigoCompilado.concat("<table>");
	
	//Linhas do arquivo
	for(var i = 0; i < arquivo.length; i++) {
		codigoCompilado = codigoCompilado.concat("<tr id='linha-" + i + "'>");
		
		//Colunas do arquivo
		for (var j = 0; j < arquivo[i].length; j++) {
			codigoCompilado = codigoCompilado.concat("<td id='celula-" + i + "-" + j+ "'>" + 
			arquivo[i][j] + "</td>");
		}
		
		codigoCompilado = codigoCompilado.concat("</tr>");
	}
	codigoCompilado = codigoCompilado.concat("</table>");
	exibirCodigoCompilado();
}

/***
 * Função que le tokens
 * author: Monica
 */
function getNextToken(linha) {
	var token;
	linha.value++;
	
	if (linha.value < tabelaTokens.length)
		token = tabelaTokens[linha.value][1];
	else token = null;
	
	return token;
}

/***
 * Função que trata a declaracao de tipos
 * author: Isabella e Monica
 */
function declaration (token , linha, hasError) {
	 var coluna;
	token = getNextToken(linha); 
	 //Se é um identificador
	 if (token == -1){
		token = getNextToken(linha);
		
		if (token != 31){		
			if (token != null) coluna = tabelaTokens[linha.value][3];
			else coluna = tabelaTokens[linha.value-1][3];
			
			if (token == 36) descricaoErro = "Não é permitido declarações múltiplas em uma linha.";
			else if (token == 2) descricaoErro = "Não é permitido atribuições na linha de declaração.";
			else {
				linha.value--;
				coluna = coluna + 1;
				descricaoErro = "A declaração deve finalizar com um ponto e vírgula.";
			}
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);
			hasError.value = 1;
		}  		
	 } else {
		descricaoErro = "Declaração incorreta! Depois de um tipo deve ser um identificador.";
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		hasError.value = 1;
	 }	 
}

/***
 * Função 
 * author:
 */
function assignment_expression (token , linha, hasError) {
	 token = getNextToken(linha);
	 	 
	 //Se é um sinal de atribução =
	 if (token == 2){
		token = getNextToken(linha);
		assignment_expression_prime(token , linha, hasError);		
		
	 } else {
		descricaoErro = "Atribuição incorreta! Depois de um identificador deve conter um sinal de atribuição.";
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		hasError.value = 1;
	 }	 
}

/***
 * Função 
 * author:
 */
function arithmetic_operation_prime (token , linha, hasError) {

	 //Operadores aritméticos
	 if (token >= 12 && token <= 17){
		token = getNextToken(linha);
		
		//Identificador ou constante
		if (token == -1 || token == -2){
			token = getNextToken(linha);			
			arithmetic_operation_prime (token , linha, hasError);
			
		} else {
			descricaoErro = "Operação aritmética deve ter um operando entre dois operadores.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
		}
		
	//ERRO: deveria ser Ponto e vírgula
	 } else if (token != 31) {
			linha.value--;
			descricaoErro = "A atribuição deve finalizar com um ponto e vírgula.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
	 }
}

/***
 * Função 
 * author:
 */
function assignment_expression_prime (token , linha, hasError) {
	 
	 //Read statement
	 if (token == 24){
		 read_statement (token , linha, hasError);
	
	//Literais
	} else if (token == 29 || token == 30){
		token = getNextToken(linha);
		
		if (token != 31){
			linha.value--;
			descricaoErro = "A atribuição deve finalizar com um ponto e vírgula.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
		}
		
	//Identificador ou constante
	 } else if (token == -1 || token == -2) {
		token = getNextToken(linha);		
		arithmetic_operation_prime (token , linha, hasError);
	
	//ERRO
	 } else {
			descricaoErro = "A atribuição está incorreta!";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
	 }
}


/***
 * Função que trata o print
 * author: Isabella
 */
function print_statement (token , linha, hasError) {
	 token = getNextToken(linha);
	 	 
	 //Se é uma literal ou um caracter ou um identificador
	 if (token == 29 || token==30 || token==-1){
	 	token = getNextToken(linha);
		if (token != 31){
			linha.value--;
			coluna = tabelaTokens[linha.value][3] + 1;
			descricaoErro = "A declaração deve finalizar com ponto e vírgula.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);
			hasError.value = 1;
		} 		
	} else {
		if (token == 34) descricaoErro = "Não é permitido string entre parênteses.";
		else descricaoErro = "Declaração incorreta! A declaração deve ser do tipo print literal ";

		if (token != null) 
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		else {
			linha.value--
			coluna = tabelaTokens[linha.value][3] + 1;
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);
			linha.value++
		}
		hasError.value = 1;
	 }	 
}

/***
 * Função que trata o read
 * author: Isabella
 */
function read_statement (token , linha, hasError) {	 
	 token = getNextToken(linha);
	 	 
	 if (token == 34){	//Se é abre parenteses
	 	token = getNextToken(linha);
		if (token == 35){ // Se fecha parenteses
			token = getNextToken(linha);
			if (token != 31) {
				linha.value--;
				coluna = tabelaTokens[linha.value][3] + 1;
				descricaoErro = "A declaração deve finalizar com ponto e vírgula.";
				inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);
				hasError.value = 1;
			}
		} else {
			linha.value--;
			coluna = tabelaTokens[linha.value][3] + 1;
			descricaoErro = 'Declaração incorreta! A declaração deve ser do tipo read ()';
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);
			hasError.value = 1;
		}	
	} else {
		descricaoErro = 'Declaração incorreta! A declaração deve ser do tipo read ()';
		if (token != null) 
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		else {
			linha.value--
			coluna = tabelaTokens[linha.value][3] + 1;
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);
			linha.value++
		}
		hasError.value = 1;
	 }	 
}

/***
 * Função que verifica se e uma expressao de comparacao ou uma expressao logica entre um identificador e/ou uma constante
 * author: Isabella
 */
function expression (token, linha, hasError) {
	if (token == -1 || token == -2){	// se e um identificador ou uma constante
		token = getNextToken(linha);		
		if (token >= 3 && token <= 10)	{	// se é um operador de comparacao (<, >, <=, >=, ==, !=, ||, &&)
			token = getNextToken(linha);
			if (token != -1 && token != -2) {	// se nao for uma constante ou um identificador
				descricaoErro = "Comparação só pode ser feita com constante e/ou identificador.";
				inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
				hasError.value = 1;
			}
		} else if (token == 11) {	// se for simbolo de negacao (!)
			token = getNextToken(linha);
			if (token != -1) {	// se nao for um identificador
				descricaoErro = "A negacao deve ser feita da seguinte forma: !identificador.";
				inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
				hasError.value = 1;
			} 
		} else {
			descricaoErro = "A negacao deve ser feita da seguinte forma: !identificador.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
		}
	} else if (token == 11) {	// se for simbolo de negacao (!)
		token = getNextToken(linha);
		if (token != -1) {	// se nao for um identificador
			descricaoErro = "A negacao deve ser feita da seguinte forma: !identificador.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
		}
	} else {
		descricaoErro = "Expressão inválida.";
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		hasError.value = 1;
	}
}

/***
 * Função que trata pedaco de codigo dentro do while
 * author: Isabella e Monica
 */
function code_snippet (token, linha, hasError) {
	var linhaAnterior = linha.value;								//Token é abre chave
	while (token != 33 && token != null) {						// enquanto for diferente de fechar chave e null
	
		if (token == 20 || token == 21){						// se e continue ou break
			token = getNextToken(linha);
			if (token != 31) {
				linha.value--
				coluna = tabelaTokens[linha.value][3] + 1;
				descricaoErro = "Deve haver um ponto e virgula depois do statement";
				inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], coluna);	
				linha.value++
				hasError.value = 1;
			}
		} else 	{
			statement(token, linha);
		}
		token = getNextToken(linha);
	}	
	
	if (token != 33){
		linha.value = linhaAnterior-1;
		descricaoErro = "Deve haver um fecha chave depois de um bloco de código.";
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);	
		linha.value = tabelaTokens.length;
	} else {
		linha.value = linha.value -1;
	}
}

/***
 * Função que trata o while
 * author: Isabella e Monica
 */
function while_statement (token , linha, hasError) {
	 token = getNextToken(linha);

	 if (token == 34) {	// Se abre parenteses
	 	token = getNextToken(linha);
	 	expression(token , linha, hasError);
	 	token = getNextToken(linha);
	 	if (token == 35) {		// Se fecha parenteses
	 		token = getNextToken(linha);
	 		if (token == 32){	// Se abre chave
	 			token = getNextToken(linha);
	 			code_snippet(token , linha, hasError);	// fecha chave dentro do code_snippet
	 			token = getNextToken(linha);
			} else {
				descricaoErro = " Depois da expressão, deve-se abrir chave.";
				inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
				hasError.value = 1;
	 		}
	 	} else {
			descricaoErro = "Deve-se fechar parênteses depois de uma expressão.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
 		}

	 } else {
		descricaoErro = 'Declaração incorreta! A declaração deve haver um abre parênteses.';
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		hasError.value = 1;
	}
}

/***
 * Função que trata o if
 * author: Isabella e Monica
 * TODO: Nao pode vir else antes de else if
 */
function if_statement_linha (token , linha, hasError) {
	if (token == 32){	// Se abre chave
		token = getNextToken(linha);
		code_snippet(token , linha, hasError);	// fecha chave dentro do code_snippet
		token = getNextToken(linha);
	} else {
		descricaoErro = " Depois da expressão, deve-se abrir chave.";
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		hasError.value = 1;
	}
}


/***
 * Função que trata o if
 * author: Isabella e Monica
 * TODO: Nao pode vir else antes de else if
 */
function if_statement (token , linha, hasError) {
	token = getNextToken(linha);

	if (token == 34) {	// Se abre parenteses
	 	token = getNextToken(linha);
	 	expression(token , linha, hasError);
	 	token = getNextToken(linha);
	 	if (token == 35) {		// Se fecha parenteses
	 		token = getNextToken(linha);
	 		if (token == 32){	// Se abre chave
	 			token = getNextToken(linha);
	 			code_snippet(token , linha, hasError);	// fecha chave dentro do code_snippet
	 			token = getNextToken(linha);
			 	if (token == 19) {	// Se e else
					token = getNextToken(linha);
					if (token == 18){		//se for if
						if_statement (token , linha, hasError);
					} else {
						 if_statement_linha (token , linha, hasError) 
					}
	 			} 
	 		} else {
				descricaoErro = " Depois da expressão, deve-se abrir chave.";
				inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
				hasError.value = 1;
	 		}
	 	} else {
			descricaoErro = "Deve-se fechar parênteses depois de uma expressão.";
			inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
			hasError.value = 1;
 		}
	 } else {
		descricaoErro = 'Declaração incorreta! A declaração deve haver um abre parênteses.';
		inserirtabelaErros(tabelaErrosSintaticos, descricaoErro, tabelaTokens[linha.value][2], tabelaTokens[linha.value][3]);
		hasError.value = 1;
	}
}

/***
 * Função 
 * author:
 */

function statement (token, linha) {
	 var hasError = {value: 0};

	 //Se for um tipo de dado - Declaração
	 if (token >= 25 && token <= 28){
		declaration(token , linha, hasError);
		 
	// Se for um identificador - Atribuição
	 } else if (token == -1) {
		assignment_expression(token , linha, hasError);
	 // While - repetição
	 } else if (token == 22) {
		 while_statement(token , linha, hasError);
		 
	 // print
	 } else if (token == 23) {

		 print_statement(token , linha, hasError);
		 
	 // read
	 } else if (token == 24) {
		 read_statement(token , linha, hasError);
		 
	 // if - condicional
	 } else if (token == 18) {
		if_statement(token , linha, hasError);
		 
	 }
	 
	 //Restaurar o estado sem erro, ou seja, percorrer até o final da linha corrente
	 if (hasError.value == 1){
		 while ((linha.value < tabelaTokens.length) && (tabelaTokens[linha.value][3] != 0)) {
				linha.value++;
				// vai parar na proxima linha correta
		 }
		 linha.value--;
	 }
}

/***
 * Função 
 * author:
 */

function sintatico () {
	var linha = {value: 0};	
	var token;

	while (linha.value < tabelaTokens.length) {
		token = tabelaTokens[linha.value][1];
		statement(token, linha);		
		linha.value++;			//Pular de linha
	}
	 exibirErrosSintaticos();
}

/***
 * Função main: função principal tratando cada caso de token
 * author: Isabella e Monica
 */
function main (arquivo) {
	
	var linhasArquivo = arquivo.length;							// Numero de linhas do arquivo de entrada
	var sentinela = {value: 0};									// Primeiro caracter lido
	var lookAhead = {value: 1};									// Ponteiro para a leitura de cada token
	var flag; 													// Variável para retorno de erros
	var retorno;												// Array de retorno das funcoes
	
	//Criação das tabelas
	retorno = criarTabelas(tabelaIdentificadores, tabelaTokens, tabelaLiterais, tabelaConstantes, 
	tabelaErrosLexicos);

	tabelaIdentificadores = retorno[0];
    tabelaTokens = retorno[1];
    tabelaLiterais = retorno[2];
    tabelaConstantes = retorno[3];
    tabelaErrosLexicos = retorno[4];
    tabelaErrosSintaticos = retorno[5];
    

	// Análise de cada linha do arquivo de entrada
	for (var linhaAtual = 0; linhaAtual < linhasArquivo; linhaAtual++) {

		sentinela.value = 0;
		lookAhead.value = 1;
	
		//Percorre os caracteres da linha
		while (sentinela.value < arquivo[linhaAtual].length) {
										
				if (arquivo[linhaAtual][sentinela.value] == " " || 
					arquivo[linhaAtual][sentinela.value] == '\t'|| 
					arquivo[linhaAtual][sentinela.value] == '\n') {
						
					consumirEspacos(arquivo[linhaAtual], sentinela, lookAhead);
				}
				
				if (arquivo[linhaAtual][sentinela.value] != undefined) { 
					
					if (delimitadores[arquivo[linhaAtual][sentinela.value]] != undefined) {
						
						tratarDelimitadores(tabelaTokens, arquivo[linhaAtual], linhaAtual, sentinela, lookAhead);
						
					} else if (((operadores[arquivo[linhaAtual][sentinela.value]] != undefined) || 
								(operadores[arquivo[linhaAtual][sentinela.value]+arquivo[linhaAtual][lookAhead.value]] != undefined)) && !(arquivo[linhaAtual][sentinela.value] == "/" &&  arquivo[linhaAtual][lookAhead.value] == "/")) {
						
						tratarOperadores (tabelaTokens, arquivo[linhaAtual], sentinela, lookAhead, linhaAtual);
						
					} else if (atribuicao[arquivo[linhaAtual][sentinela.value]] != undefined) {
						
						tratarAtribuicao (tabelaTokens, arquivo[linhaAtual], linhaAtual, sentinela, lookAhead);
						
					} else 	if (semicolon[arquivo[linhaAtual][sentinela.value]] != undefined) {
						
						tratarSemicolon (tabelaTokens, arquivo[linhaAtual][sentinela.value], linhaAtual, sentinela, lookAhead);	
						
					} else if (literais[arquivo[linhaAtual][sentinela.value]] != undefined) {
						
						tratarLiteral (tabelaTokens, tabelaLiterais, tabelaErrosLexicos, arquivo[linhaAtual], sentinela, lookAhead, linhaAtual);
						
					} else if (arquivo[linhaAtual][sentinela.value] == "/" && 
							   arquivo[linhaAtual][lookAhead.value] == "/" ) {
								   
						tratarComentario(tabelaTokens, arquivo[linhaAtual], sentinela, lookAhead, linhaAtual);
						
					} else if (isNumeric(arquivo[linhaAtual][sentinela.value]))  {
						
						tratarNumero (tabelaTokens, tabelaConstantes, tabelaErrosLexicos, arquivo[linhaAtual], sentinela, lookAhead, linhaAtual);
						
					} else if (isLetter(arquivo[linhaAtual][sentinela.value])){
						
						verificarToken(tabelaTokens, tabelaIdentificadores, arquivo[linhaAtual], sentinela, lookAhead, 
						linhaAtual);		

					} else {			
						var descricaoErro = "Ooops! Isso eu não conheço! Você pode verificar o erro pra mim!?";
						inserirtabelaErros (tabelaErrosLexicos, descricaoErro, linhaAtual, sentinela.value);
						sentinela.value = arquivo[linhaAtual].length + 1;
					}
				
			} else {
				sentinela.value = arquivo[linhaAtual].length + 1;
			}
		}//end While
	}//end for

	var divDownload = document.getElementById('botao-download-div');
	divDownload.classList.remove("ocultar-div");	

	sintatico ();
	
	exibirTabelas(tabelaTokens, tabelaConstantes, tabelaLiterais, tabelaIdentificadores,tabelaErrosLexicos);
	gerarArquivoTexto(tabelaTokens, tabelaConstantes, tabelaLiterais, tabelaErrosLexicos, tabelaIdentificadores, tabelaErrosSintaticos);

}//End main
