const app   = require('express')()
const http  = require('http').Server(app)
const https = require('https')
const io    = require('socket.io')(http)

const apiDelay    = 30000
const port        = 3000
let lowestRanks   = []
let previousRanks = []

function getCoinsInfo () {
  const options = {
    host: 'api.coincap.io',
    path: '/v2/assets',
    method: 'GET',
    headers: {}
  }

  const req = https.request(options, res => {
    const chunks  = []
  	previousRanks = lowestRanks

    res.on('data', chunk => {
      chunks.push(chunk)
    })
  
    res.on('end', chunk => {
      const body = Buffer.concat(chunks)
      const info = JSON.parse(body.toString()).data  
      
      lowestRanks = info.filter(item => {
        return item.rank <= 5 && item.rank > 0
      }).map(item => {
				return {
					id:     item.id,
    			name:   item.name,
    			symbol: item.symbol,
    			rank:   item.rank,
    			price:  item.priceUsd
				}
			})

      console.log(lowestRanks)
      emitData(previousRanks, lowestRanks)
    })
  
    res.on('error', error => {
      console.error(error)
    })
  })

  req.write('')	
  req.end()
}

function emitData (previousRanks, lowestRanks) {
	if ((previousRanks.length > 0) && (lowestRanks.length > 0)) {
  	for (let i = 0; i < 5; i++) {
  		if (previousRanks[i].price !== lowestRanks[i].price) {
  			io.emit('Created', lowestRanks)
  			break
  		}		
  	}  	
  } 
}

getCoinsInfo()

setInterval(() => {
  getCoinsInfo()
}, apiDelay)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', socket => {
  console.log(`a user with id ${socket.id} connected`)
  socket.emit('Created', lowestRanks)
   
  socket.on('disconnect', () => {
    console.log(`user with id ${socket.id} disconnected`)    
  })
})

http.listen(port, () => {
  console.log(`listening on port: ${port}`)
})
