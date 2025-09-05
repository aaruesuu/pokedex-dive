// --- DOM要素の取得 (変更なし) ---
const modeSelectionScreen = document.getElementById('mode-selection-screen');
const classicModeButton = document.getElementById('classic-mode-button');
const scoreAttackButton = document.getElementById('score-attack-button');
const baseStatsModeButton = document.getElementById('base-stats-mode-button');
const gameContainer = document.getElementById('game-container');
const scoreScreen = document.getElementById('score-screen');
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const messageArea = document.getElementById('message-area');
const resultHistory = document.getElementById('result-history');
const resultHeader = document.getElementById('result-header');
const gameControls = document.getElementById('game-controls');
const inputArea = document.getElementById('input-area');
const suggestionsBox = document.getElementById('suggestions-box');
const nextQuestionButton = document.getElementById('next-question-button');
const backToMenuButton = document.getElementById('back-to-menu-button');
const playAgainButton = document.getElementById('play-again-button');
const finalScoreSpan = document.getElementById('final-score');
const gameTitle = document.getElementById('game-title');
const gameDescription = document.getElementById('game-description');
const gameStatus = document.getElementById('game-status');
const homeButton = document.getElementById('home-button');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const modalCloseButton = document.getElementById('modal-close-button');
const howToPlayButton = document.getElementById('how-to-play-button');
const aboutSiteButton = document.getElementById('about-site-button');
const infoButtons = document.querySelectorAll('.info-button');
const loaderOverlay = document.getElementById('loader-overlay'); // ローダーを追加

// --- グローバル変数と定数 (変更なし) ---
const allPokemonNames = Object.keys(pokemonNameMap);
let correctPokemon = null;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/';
const MAX_POKEMON_ID = 1025;
const gen9PokemonData = gen9Data; 

// --- ゲーム状態変数 (変更なし) ---
let gameMode = null; 
let gameOver = false;
let guessesLeft = 5;
let correctCount = 0;
let totalGuesses = 0;
let answeredPokemonIds = new Set();


// --- メインロジック ---

function hiraToKana(str) {
    return str.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
}

// 画面切り替え関数
function switchScreen(targetScreen) {
    const screens = [modeSelectionScreen, gameContainer, scoreScreen];
    screens.forEach(screen => {
        if (screen.id === targetScreen) {
            screen.classList.remove('hidden');
            screen.classList.add('fade-in');
        } else {
            screen.classList.add('hidden');
            screen.classList.remove('fade-in');
        }
    });
}

function startGame(mode) {
    gameMode = mode;
    resetGame();
    switchScreen('game-container');
    setupUIForMode();
    initGame();
}

function setupUIForMode() {
    resultHeader.innerHTML = '';
    if (gameMode === 'classic' || gameMode === 'scoreAttack') {
        gameTitle.textContent = gameMode === 'classic' ? 'クラシックモード' : 'スコアアタック';
        gameDescription.textContent = gameMode === 'classic' ? '5回のうちにポケモンを当てよう！' : '3匹当てるまでの合計回答数を競え！';
        resultHeader.className = 'result-header-classic';
        resultHeader.innerHTML = `
            <span>#</span>
            <span>名前</span>
            <span>世代</span>
            <span>タイプ1</span>
            <span>タイプ2</span>
            <span>高さ</span>
            <span>重さ</span>
            <span>進化</span>`;
    } else if (gameMode === 'baseStats') {
        gameTitle.textContent = '種族値アタック';
        gameDescription.textContent = '種族値をヒントに3匹当てろ！';
        resultHeader.className = 'result-header-stats';
        resultHeader.innerHTML = `
            <span>#</span>
            <span>名前</span>
            <span>HP</span>
            <span>攻撃</span>
            <span>防御</span>
            <span>特攻</span>
            <span>特防</span>
            <span>素早さ</span>`;
    }
    resultHeader.classList.remove('hidden');
    updateStatusUI();
}

function updateStatusUI() {
    if (gameMode === 'classic') {
        gameStatus.innerHTML = `<div>残り: <span id="guesses-left">${guessesLeft}</span> 回</div>`;
    } else {
        gameStatus.innerHTML = `
            <div>正解数: <span id="correct-count">${correctCount}</span> / 3</div>
            <div>合計回答数: <span id="total-guesses">${totalGuesses}</span></div>`;
    }
}

async function initGame(retryCount = 3) {
    if (retryCount <= 0) {
        messageArea.textContent = 'ポケモンの読み込みに失敗しました。HOMEに戻ってやり直してください。';
        guessInput.disabled = true;
        guessButton.disabled = true;
        backToMenuButton.classList.remove('hidden');
        return;
    }

    guessInput.disabled = true;
    guessButton.disabled = true;
    messageArea.textContent = `次のポケモンを読み込み中...`;
    
    let randomId;
    let retries = 0;
    const maxRetries = 20;
    while (true) {
        randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
        if (!answeredPokemonIds.has(randomId)) {
            break;
        }
        retries++;
        if (retries > maxRetries) {
            console.warn("出題済みのポケモンが多いため、履歴をリセットします。");
            answeredPokemonIds.clear();
        }
    }
    
    let pokemonData = null;
    const gen9Entry = Object.values(gen9PokemonData).find(data => data.id === randomId);
    if (gen9Entry) {
        pokemonData = gen9Entry;
    } else {
        pokemonData = await fetchPokemonDataFromApi(randomId);
    }

    if (pokemonData) {
        correctPokemon = pokemonData;
        console.log(`正解:`, correctPokemon);
        messageArea.textContent = `ポケモンを推測しよう！`;
        resultHistory.innerHTML = '';
        guessInput.disabled = false;
        guessButton.disabled = false;
        guessInput.focus();
    } else {
        answeredPokemonIds.add(randomId);
        messageArea.textContent = `[ID: ${randomId}] の読み込みに失敗。再試行します... (${4 - retryCount}/3)`;
        setTimeout(() => initGame(retryCount - 1), 50);
    }
}

function resetGame() {
    gameOver = false;
    guessesLeft = 5;
    correctCount = 0;
    totalGuesses = 0;
    answeredPokemonIds.clear();
    messageArea.textContent = '';
    resultHistory.innerHTML = '';
    resultHeader.classList.add('hidden');
    inputArea.classList.remove('hidden');
    nextQuestionButton.classList.add('hidden');
    backToMenuButton.classList.add('hidden');
    updateStatusUI();
}

async function handleGuess() {
    if (gameOver) return;
    
    let guessNameJa = hiraToKana(guessInput.value.trim());
    if (!guessNameJa) return;

    suggestionsBox.classList.add('hidden');

    let guessedPokemon = null;
    
    const gen9Match = Object.values(gen9PokemonData).find(p => p.name === guessNameJa);
    if (gen9Match) {
        guessedPokemon = gen9Match;
    } else {
        const guessNameEn = pokemonNameMap[guessNameJa];
        if (!guessNameEn) {
            messageArea.textContent = `「${guessNameJa}」というポケモンは見つかりませんでした。`;
            return;
        }
        guessButton.disabled = true;
        messageArea.textContent = `${guessNameJa}の情報を調べています...`;
        guessedPokemon = await fetchPokemonDataFromApi(guessNameEn);
    }


    if (!guessedPokemon) {
        messageArea.textContent = `「${guessNameJa}」のデータ取得に失敗しました。`;
        guessButton.disabled = false;
        return;
    }
    
    if (gameMode === 'classic') {
        guessesLeft--;
    } else {
        totalGuesses++;
    }

    updateStatusUI();
    
    const comparison = comparePokemon(guessedPokemon, correctPokemon);
    renderResult(guessedPokemon, comparison);

    const isCorrect = guessedPokemon.id === correctPokemon.id;

    if (gameMode === 'classic') {
        if (isCorrect) {
            messageArea.textContent = `正解！おめでとう！答えは ${correctPokemon.name} でした！`;
            endGame();
        } else if (guessesLeft === 0) {
            messageArea.textContent = `残念！ゲームオーバー。正解は ${correctPokemon.name} でした。`;
            endGame();
        } else {
            messageArea.textContent = `ポケモンを推測しよう！`;
        }
    } else { // scoreAttack or baseStats
        if (isCorrect) {
            correctCount++;
            answeredPokemonIds.add(correctPokemon.id);
            updateStatusUI();
            if (correctCount < 3) {
                messageArea.textContent = `正解！ ${correctPokemon.name} でした！`;
                inputArea.classList.add('hidden');
                nextQuestionButton.classList.remove('hidden');
            } else {
                showScoreScreen();
            }
        } else {
            messageArea.textContent = `ポケモンを推測しよう！`;
        }
    }
    
    guessInput.value = '';
    if (!gameOver && !isCorrect) {
        guessButton.disabled = false;
        guessInput.focus();
    }
}

function endGame() {
    gameOver = true;
    inputArea.classList.add('hidden');
    backToMenuButton.classList.remove('hidden');
}

function showScoreScreen() {
    finalScoreSpan.textContent = totalGuesses;
    switchScreen('score-screen');
}

function handleInput() {
    const inputText = guessInput.value.trim();
    if (inputText.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }
    const inputTextKana = hiraToKana(inputText);
    const suggestions = allPokemonNames.filter(name => name.startsWith(inputTextKana)).slice(0, 5);
    suggestionsBox.innerHTML = '';
    if (suggestions.length > 0) {
        suggestions.forEach(name => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = name;
            suggestionItem.className = 'suggestion-item';
            suggestionItem.addEventListener('click', () => {
                guessInput.value = name;
                suggestionsBox.classList.add('hidden');
                guessInput.focus();
            });
            suggestionsBox.appendChild(suggestionItem);
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.classList.add('hidden');
    }
}


async function fetchPokemonDataFromApi(pokemonIdentifier) {
    try {
        const identifier = pokemonIdentifier.toString().toLowerCase();
        const pokemonRes = await fetch(`${POKEAPI_BASE_URL}pokemon/${identifier}`);
        if (!pokemonRes.ok) throw new Error('Pokemon not found');
        const pokemonData = await pokemonRes.json();
        
        const speciesRes = await fetch(pokemonData.species.url);
        if (!speciesRes.ok) throw new Error('Species not found');
        const speciesData = await speciesRes.json();
        
        const evolutionChainRes = await fetch(speciesData.evolution_chain.url);
        if (!evolutionChainRes.ok) throw new Error('Evolution chain not found');
        const evolutionChainData = await evolutionChainRes.json();
        
        const evolutionCount = getEvolutionCount(evolutionChainData, speciesData.name);
        const name = speciesData.names.find(n => n.language.name === 'ja-Hrkt')?.name || pokemonData.name;
        
        let generationId = 8;
        if (speciesData.generation) {
            const generationUrl = speciesData.generation.url;
            generationId = parseInt(generationUrl.split('/').slice(-2, -1)[0]);
        }
        
        const typeNameMap = {"normal":"ノーマル","fire":"ほのお","water":"みず","grass":"くさ","electric":"でんき","ice":"こおり","fighting":"かくとう","poison":"どく","ground":"じめん","flying":"ひこう","psychic":"エスパー","bug":"むし","rock":"いわ","ghost":"ゴースト","dragon":"ドラゴン","dark":"あく","steel":"はがね","fairy":"フェアリー"};
        const japaneseTypes = pokemonData.types.map(t => typeNameMap[t.type.name] || t.type.name);
        
        const stats = {
            hp: pokemonData.stats[0].base_stat,
            attack: pokemonData.stats[1].base_stat,
            defense: pokemonData.stats[2].base_stat,
            spAttack: pokemonData.stats[3].base_stat,
            spDefense: pokemonData.stats[4].base_stat,
            speed: pokemonData.stats[5].base_stat,
        };

        return {
            id: pokemonData.id, name: name, generation: generationId,
            type1: japaneseTypes[0] || 'なし', type2: japaneseTypes[1] || 'なし',
            height: pokemonData.height / 10, weight: pokemonData.weight / 10,
            sprite: pokemonData.sprites.front_default, evolutionCount: evolutionCount,
            stats: stats
        };
    } catch (error) {
        console.error(`Data fetch error for ${pokemonIdentifier}:`, error);
        return null;
    }
}

function getEvolutionCount(chainData, speciesName) {
    function findPokemon(stage, count) {
        if (stage.species.name.startsWith(speciesName.split('-')[0])) {
            return count;
        }
        for (const nextStage of stage.evolves_to) {
            const result = findPokemon(nextStage, count + 1);
            if (result !== null) return result;
        }
        return null;
    }
    return findPokemon(chainData.chain, 0) ?? 0;
}

function comparePokemon(guessed, correct) {
    if (gameMode === 'baseStats') {
        const result = { stats: {} };
        const statKeys = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];
        statKeys.forEach(stat => {
            if (guessed.stats[stat] === correct.stats[stat]) {
                result.stats[stat] = { class: 'bg-green', symbol: '✔' };
            } else {
                const symbol = guessed.stats[stat] > correct.stats[stat] ? '▼' : '▲';
                result.stats[stat] = { class: 'bg-gray', symbol: symbol };
            }
        });
        return result;
    } else {
        const result = {};
        if (guessed.generation === correct.generation) result.generation = 'bg-green';
        else if (Math.abs(guessed.generation - correct.generation) <= 1) result.generation = 'bg-yellow';
        else result.generation = 'bg-gray';
        if (guessed.type1 === correct.type1) result.type1 = 'bg-green';
        else if (guessed.type1 === correct.type2) result.type1 = 'bg-yellow';
        else result.type1 = 'bg-gray';
        if (guessed.type2 === correct.type2) result.type2 = 'bg-green';
        else if (guessed.type2 === correct.type1 && guessed.type2 !== 'なし') result.type2 = 'bg-yellow';
        else result.type2 = 'bg-gray';
        result.height = guessed.height > correct.height ? '▼' : (guessed.height < correct.height ? '▲' : '✔');
        result.weight = guessed.weight > correct.weight ? '▼' : (guessed.weight < correct.weight ? '▲' : '✔');
        if (guessed.evolutionCount === correct.evolutionCount) result.evolutionCount = 'bg-green';
        else result.evolutionCount = 'bg-gray';
        return result;
    }
}

function renderResult(pokemon, comparison) {
    const row = document.createElement('div');
    row.classList.add('result-row', 'fade-in');
    
    if (gameMode === 'baseStats') {
        row.className = 'result-row result-row-stats';
        row.innerHTML = `
            <div><img src="${pokemon.sprite}" alt="${pokemon.name}"></div>
            <div class="font-bold">${pokemon.name}</div>
            <div class="${comparison.stats.hp.class}"><span>${pokemon.stats.hp}</span> <span>${comparison.stats.hp.symbol}</span></div>
            <div class="${comparison.stats.attack.class}"><span>${pokemon.stats.attack}</span> <span>${comparison.stats.attack.symbol}</span></div>
            <div class="${comparison.stats.defense.class}"><span>${pokemon.stats.defense}</span> <span>${comparison.stats.defense.symbol}</span></div>
            <div class="${comparison.stats.spAttack.class}"><span>${pokemon.stats.spAttack}</span> <span>${comparison.stats.spAttack.symbol}</span></div>
            <div class="${comparison.stats.spDefense.class}"><span>${pokemon.stats.spDefense}</span> <span>${comparison.stats.spDefense.symbol}</span></div>
            <div class="${comparison.stats.speed.class}"><span>${pokemon.stats.speed}</span> <span>${comparison.stats.speed.symbol}</span></div>
        `;
    } else {
        row.className = 'result-row result-row-classic';
        row.innerHTML = `
            <div><img src="${pokemon.sprite}" alt="${pokemon.name}"></div>
            <div class="font-bold">${pokemon.name}</div>
            <div class="${comparison.generation}">${pokemon.generation}</div>
            <div class="${comparison.type1}">${pokemon.type1}</div>
            <div class="${comparison.type2}">${pokemon.type2}</div>
            <div class="bg-gray"><span>${pokemon.height}m</span> <span>${comparison.height}</span></div>
            <div class="bg-gray"><span>${pokemon.weight}kg</span> <span>${comparison.weight}</span></div>
            <div class="${comparison.evolutionCount}">${pokemon.evolutionCount}</div>
        `;
    }
    resultHistory.insertAdjacentElement('afterbegin', row);
}

// --- イベントリスナーの設定 ---
document.addEventListener('DOMContentLoaded', () => {
    // ローディング画面を非表示に
    setTimeout(() => {
        loaderOverlay.style.opacity = '0';
        setTimeout(() => loaderOverlay.classList.add('hidden'), 500);
    }, 1500);
    
    classicModeButton.addEventListener('click', () => startGame('classic'));
    scoreAttackButton.addEventListener('click', () => startGame('scoreAttack'));
    baseStatsModeButton.addEventListener('click', () => startGame('baseStats'));

    guessButton.addEventListener('click', handleGuess);
    guessInput.addEventListener('keydown', (event) => {
        if (event.isComposing) return;
        if (event.key === 'Enter') handleGuess();
    });

    nextQuestionButton.addEventListener('click', () => {
        nextQuestionButton.classList.add('hidden');
        inputArea.classList.remove('hidden');
        initGame();
    });

    const backToMenu = () => {
        switchScreen('mode-selection-screen');
    };
    backToMenuButton.addEventListener('click', backToMenu);
    playAgainButton.addEventListener('click', () => startGame(gameMode)); // 同じモードで再挑戦
    homeButton.addEventListener('click', backToMenu);

    guessInput.addEventListener('input', handleInput);
    document.addEventListener('click', (event) => {
        if (!gameControls.contains(event.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });

const modalOverlay = document.getElementById('modal-overlay');

const openModal = (title, content) => {
    modalContent.innerHTML = `<h3>${title}</h3>${content}`;
    modalOverlay.classList.remove('hidden'); // hiddenクラスは使わないので念のため削除
    modalOverlay.classList.add('visible');
};

const closeModal = () => {
    modalOverlay.classList.remove('visible');
};

    howToPlayButton.addEventListener('click', () => {
        openModal('遊び方', `
            <p>このゲームは、ポケモンの様々なデータをヒントにしながら正解のポケモンを推測するゲームです。</p>
            <br>
            <p>回答を入力すると、正解のポケモンと比較したヒントが表示されます。</p>
            <ul>
                <li><span class="color-chip green"></span><strong>緑色:</strong> 完全一致</li>
                <li><span class="color-chip yellow"></span><strong>黄色:</strong> 部分的に一致 (例: タイプ1とタイプ2が逆)</li>
                <li><span class="color-chip gray"></span><strong>灰色:</strong> 不一致</li>
                <li><strong>▲ / ▼:</strong> 正解より高いか低いかを示します。</li>
            </ul>
        `);
    });

    aboutSiteButton.addEventListener('click', () => {
        openModal('このサイトについて', `
            <p>Pokedex Diveは、ポケモンを推測して楽しむファンゲームです。</p>
            <p>ポケモンのデータは <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer">PokéAPI</a> を利用しています。</p>
            <p>ご意見やバグ報告は、開発者の連絡先までお願いします。</p>
        `);
    });

    infoButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const mode = event.target.dataset.mode;
            if (mode === 'scoreAttack') {
                openModal('スコアアタック', '<p>3匹のポケモンを当てるまでにかかった合計回答数を競うモードです。より少ない回数でのクリアを目指しましょう！</p>');
            } else if (mode === 'classic') {
                openModal('クラシックモード', '<p>1匹のポケモンを5回の回答チャンスのうちに当てる、シンプルなモードです。</p>');
            } else if (mode === 'baseStats') {
                openModal('種族値アタック', '<p>ポケモンの「HP、こうげき、ぼうぎょ、とくこう、とくぼう、すばやさ」の6つの種族値のヒントだけを頼りに、3匹のポケモンを当てるモードです。</p>');
            }
        });
    });

    modalCloseButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
});
