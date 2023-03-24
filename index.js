const requestPromise = require('request-promise')
const cheerio = require('cheerio')
const { TeamSpeak } = require("ts3-nodejs-library")
const Config = require('./config.json')
const statusCode = {
    Fixed: "wurde behoben",
    Ongoing: "in Bearbeitung"
}
const relevantCategories = Config.RelevantCategories
const checkInterval = Config.CheckInterval
const teamspeak = new TeamSpeak(Config.TeamspeakConnection)
incidentCheckedOnStartUp = false
incidentReported = false


function isIncidentOngoing(incidents) {
    ongoing = false

    for (const incident of incidents) {
        if (incident.status == statusCode.Ongoing) {
            ongoing = true
            break
        }
    }

    return ongoing
}

function isOngoingIncidentRelevant(incident) {
    relevant = false

    for (const category of incident.categories) {
        if (relevantCategories.includes(category)) {
            relevant = true
            break
        }
    }

    return relevant
}

function getOngoingIncident(incidents) {
    ongoing = false

    for (const incident of incidents) {
        index = incidents.indexOf(incident)
        if (incident.status == statusCode.Ongoing) {
            ongoing = index
            break
        }
    }

    return ongoing
}

function isIncidentReported() {
    return incidentReported
}

function setIncidentReported(bool) {
    incidentReported = bool
}

function forceIncidentReportCheck() {
    getServerTree(teamspeak)
    .then(channels => {
        channels.forEach(channel => {
            if (channel.name.match("Störung beim Hoster")) {
                setIncidentReported(true)
                console.log("Found currently active incident on startup")
            }
        })
    })
}

function checkForIncidents() {
    if (Config.LogIncidentCheck) {
        console.log("Performing incident check...")
    }
    
    requestPromise(Config.SiteUrl)
    .then(function(html){
        $ = cheerio.load(html);

        // Incidents
        incidents = []
        $('#main > .container > .row > .col-12').each( (index, element) => { 
            entryString = ""
            $(element).find('.entry > p').each((i, paragraph) => { entryString += $(paragraph).text() + "\n" } )

            incidents.push({
                id: $(element).find('.posting').attr('id'),
                entry: entryString
            }) 
        } )
        
        incidents.forEach(post => {
            // Titles
            $('#' + post.id).find('h2 > a').each( (index, element) => { 
                post['title'] = $(element).text()
                post['link'] = $(element).attr('href')
            })
          
            // Categories
            post['categories'] = []
            $('#' + post.id).find('.postdata > a').each( (index, element) => { post['categories'].push( $(element).text() ) } )
          
            // Status
            incidentStatus = $('#' + post.id).find('.status-button > .button').text().match( /(\s([a-zA-Z]+\s)+)/ )[0]
            incidentStatus = incidentStatus.substring(1, incidentStatus.length-1)
            post['status'] = incidentStatus
        })    

        // Parse Accidents, try to report them if necessary
        tryReportAccidents(incidents)
    })
    .catch(function(err){
        console.log(err)
    });
}

function getServerTree(teamspeak) {
    return teamspeak.channelList().then((channelList) => {
        channels = []
        promises = []
        
        channelList.forEach(channel => {
            promises.push(
                channel.getClients().then(clientList => {
                    channelClients = []
                    
                    clientList.forEach(client => {channelClients.push({id: client.clid, name: client.nickname})})

                    channels.push({
                        id: channel.cid,
                        name: channel.name,
                        pid: channel.pid,
                        clients: channelClients
                    })
                })
            )
        })
        return Promise.all(promises).then(() => { return channels })
    })
}

function tryReportAccidents(incidents) {
    if (isIncidentOngoing(incidents) && !isIncidentReported()) {  
        console.log("Currently active incident registered")
    
        incidentId = getOngoingIncident(incidents)
        incident = incidents[incidentId]
    
        if (isOngoingIncidentRelevant(incident)) {
            console.log("Incident is relevant")
        
            teamspeak.channelCreate("[cspacer]Infos in der Beschreibung", {
                channelFlagPermanent: true,
                channelOrder: 0, 
                channelDescription: incident.entry + "Link: [url]" + incident.link + "[/url]"
            })
        
            teamspeak.channelCreate("[cspacer]Aktuell liegt eine Störung vor!", {
                channelFlagPermanent: true,
                channelOrder: 0, 
                channelDescription: ""
            })
        
            teamspeak.channelCreate("[cspacer]Störung beim Hoster", {
                channelFlagPermanent: true,
                channelOrder: 0, 
                channelDescription: ""
            })
            setIncidentReported(true)
        }
    }
    else if (!isIncidentOngoing(incidents) && isIncidentReported()) {
        getServerTree(teamspeak)
        .then(channels => {
            channels.forEach(channel => {
                if (channel.name.match("Störung beim Hoster"))
                    teamspeak.channelDelete(channel.id, 1)
            
                if (channel.name.match("Aktuell liegt eine Störung vor!"))
                    teamspeak.channelDelete(channel.id, 1)
            
                if (channel.name.match("Infos in der Beschreibung"))
                    teamspeak.channelDelete(channel.id, 1)
            })
        })
        setIncidentReported(false)
    }
}

teamspeak.on("ready", () => {
    forceIncidentReportCheck()
    checkForIncidents()
    setInterval(checkForIncidents, checkInterval)
})

teamspeak.on("error", (e) => {
    console.log(e)
})

teamspeak.on("close", async () => {
    console.log("disconnected, trying to reconnect...")
    await teamspeak.reconnect(-1, 1000)
    console.log("reconnected!")
})