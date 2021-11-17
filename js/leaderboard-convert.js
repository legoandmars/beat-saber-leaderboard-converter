const customLevelIdentifier = "custom_level_";
const difficultyNames = ["ExpertPlus", "Expert", "Hard", "Normal", "Easy"];

const beatsaverAPIEndpoint = "https://api.beatsaver.com/maps/hash/"

let fileInput;

let downloadButton;

let csv;

function jsonFromFile(file){
    return new Promise(resolve => {
        console.log(file);
        if(file){
            let fileReader = new FileReader();

            fileReader.onload = (e) => {
                let result = JSON.parse(e.target.result);                
                resolve(result);
            }

            fileReader.readAsText(file);
        }
    });
}

function downloadToFile(content, filename, contentType){
    const a = document.createElement('a');
    const file = new Blob([content], {type: contentType});
    
    a.href= URL.createObjectURL(file);
    a.download = filename;
    a.click();
  
    URL.revokeObjectURL(a.href);
};

function csvFromParsedLeaderboards(parsedLeaderboards){
    let formatted = [];
    for(let i = 0; i < parsedLeaderboards.length; i++){
        let leaderboard = parsedLeaderboards[i];
        for(let j = 0; j < leaderboard["Player"].length; j++){
            formatted.push({
                "Map Name": leaderboard["Map Name"],
                "BeatSaver Key": leaderboard["BeatSaver Key"],
                "Difficulty": leaderboard["Difficulty"],                
                "Player": leaderboard["Player"][j],
                "Score": leaderboard["Score"][j],
                "Full Combo": leaderboard["Full Combo"][j],
                "Date": leaderboard["Date"][j]
            })
        }
    }
    
    let csvString = Object.keys(formatted[0]).join(",") + "\n";

    for(let i = 0; i < formatted.length; i++){
        csvString += Object.values(formatted[i]).join(",");
        if(i < formatted.length - 1){
            csvString += "\n"
        }
    }

    return csvString;
}

// Map Name, BeatSaver Key, Difficulty, Player, Score, Full Combo, Date

async function convert(file){
    let json = await jsonFromFile(file);

    console.log(json);
    let parsedLeaderboards = [];
    for(let i = 0; i < json["_leaderboardsData"].length; i++){
        let parsedLeaderboard = {"Player": [], "Score": [], "Full Combo": [], "Date": []};

        let canParseAsCustomLevel = false;

        let leaderboardData = json["_leaderboardsData"][i];
        let leaderboardName = leaderboardData["_leaderboardId"];

        let difficulty;

        for(let j = 0; j < difficultyNames.length; j++){
            if(leaderboardName.includes(difficultyNames[j])){
                difficulty = difficultyNames[j];
                break;
            }
        }

        if(leaderboardName.includes(customLevelIdentifier)){
            // custom level specific logic
            let idOffset = leaderboardName.indexOf(customLevelIdentifier) + customLevelIdentifier.length;
            let hash = leaderboardName.substring(idOffset);

            // remove difficulties from hash manually
            for(let j = 0; j < difficultyNames.length; j++){
                hash = hash.replace(difficultyNames[j], "");
            }

            var data = await getBeatsaverData(hash);

            console.log(data.name);
            console.log(data.id);

            if(data != null && data.name != null && data.id != null){
                console.log("gaming");
                parsedLeaderboard["Map Name"] = data.name;
                parsedLeaderboard["BeatSaver Key"] = data.id; 

                canParseAsCustomLevel = true;
            }
        }

        if(!canParseAsCustomLevel){
            parsedLeaderboard["Map Name"] = leaderboardData["_leaderboardId"];
            parsedLeaderboard["BeatSaver Key"] = "";
        }

        // generic fields that work for custom or ost
        parsedLeaderboard["Difficulty"] = difficulty;

        for(let i = 0; i < leaderboardData["_scores"].length; i++){
            let score = leaderboardData["_scores"][i];

            // what.
            var dateString = new Date(score["_timestamp"] * 1000).toLocaleDateString('fr-CA');

            parsedLeaderboard["Player"].push(score["_playerName"]);
            parsedLeaderboard["Score"].push(score["_score"]);
            parsedLeaderboard["Full Combo"].push(score["_fullCombo"]);
            parsedLeaderboard["Date"].push(dateString);
        }

        parsedLeaderboards.push(parsedLeaderboard);
    }

    console.log(parsedLeaderboards);

    csv = csvFromParsedLeaderboards(parsedLeaderboards);

    downloadButton.disabled = false;
}

async function getBeatsaverData(hash){
    return new Promise(resolve => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", beatsaverAPIEndpoint + hash, true);

        xhr.onload = (e) => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(xhr.statusText);
                }
            }
        };

        xhr.onerror = (e) => {
            reject(xhr.statusText);
        };

        xhr.send();
    });
} 

function initializeButton(){
    fileInput = document.querySelector('#upload input[type=file]')
    
    downloadButton = document.getElementById("download-button");
    fileInput.accept = ".dat";
    downloadButton.disabled = true;

    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        const fileName = document.getElementById("filename");
        fileName.textContent = fileInput.files[0].name;

        convert(fileInput.files[0]);
      }
    }

    downloadButton.onclick = () => {
        console.log("Downloading...");
        if(csv != null) downloadToFile(csv, "LeaderboardData.csv", "text/csv");
    }
}

window.onload = function(){
    console.log("big whoop");

    initializeButton();
}