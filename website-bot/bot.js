import puppeteer from 'puppeteer'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const CONFIG = {
  websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000',
  graphqlUrl: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql',
  botInterval: parseInt(process.env.BOT_INTERVAL || '10000'), // milliseconds
  sessionDuration: parseInt(process.env.SESSION_DURATION || '60000'), // milliseconds
  concurrentBots: parseInt(process.env.CONCURRENT_BOTS || '3'),
  headless: process.env.HEADLESS !== 'false',
}

const actions = [
  'viewProducts',
  'viewInventory',
  'scrollPage',
  'waitAndRefresh',
  'viewDetails',
]

/**
 * Makes a GraphQL query directly
 */
async function makeGraphQLQuery(query) {
  try {
    const response = await axios.post(CONFIG.graphqlUrl, { query }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    })
    return response.data
  } catch (error) {
    console.error('GraphQL Query Error:', error.message)
    return null
  }
}

/**
 * Initializes a browser session
 */
async function createBotSession(botId) {
  console.log(`[Bot ${botId}] Starting browser session...`)

  try {
    const browser = await puppeteer.launch({
      headless: CONFIG.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Set viewport to simulate different devices
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 }, // Tablet
      { width: 375, height: 667 }, // Mobile
    ]
    const viewport = viewports[Math.floor(Math.random() * viewports.length)]
    await page.setViewport(viewport)

    // Set user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    ]
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)])

    return { browser, page, botId }
  } catch (error) {
    console.error(`[Bot ${botId}] Failed to create browser session:`, error.message)
    return null
  }
}

/**
 * Simulates user viewing products
 */
async function viewProducts(page, botId) {
  try {
    console.log(`[Bot ${botId}] Navigating to website...`)
    await page.goto(CONFIG.websiteUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 }).catch(() => {
      console.log(`[Bot ${botId}] Products may not have loaded`)
    })

    console.log(`[Bot ${botId}] Viewing products...`)
    const productCount = await page.$$eval('.product-card', cards => cards.length).catch(() => 0)
    console.log(`[Bot ${botId}] Found ${productCount} products`)

    return true
  } catch (error) {
    console.error(`[Bot ${botId}] Error viewing products:`, error.message)
    return false
  }
}

/**
 * Simulates user scrolling the page
 */
async function scrollPage(page, botId) {
  try {
    console.log(`[Bot ${botId}] Scrolling page...`)
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight)
    })

    // Random scroll pause
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))

    return true
  } catch (error) {
    console.error(`[Bot ${botId}] Error scrolling:`, error.message)
    return false
  }
}

/**
 * Simulates user clicking on inventory details
 */
async function viewInventory(page, botId) {
  try {
    console.log(`[Bot ${botId}] Looking for inventory details button...`)

    // Get all detail buttons
    const buttons = await page.$$('.view-inventory')
    if (buttons.length === 0) {
      console.log(`[Bot ${botId}] No inventory buttons found`)
      return false
    }

    // Click a random button
    const randomIndex = Math.floor(Math.random() * buttons.length)
    await buttons[randomIndex].click()

    console.log(`[Bot ${botId}] Clicked inventory button ${randomIndex + 1}/${buttons.length}`)

    // Wait for modal to appear
    await page.waitForSelector('.modal.active', { timeout: 5000 }).catch(() => {
      console.log(`[Bot ${botId}] Modal may not have appeared`)
    })

    // Random time viewing details
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000))

    return true
  } catch (error) {
    console.error(`[Bot ${botId}] Error viewing inventory:`, error.message)
    return false
  }
}

/**
 * Simulates user closing modal and waiting
 */
async function closeModalAndWait(page, botId) {
  try {
    const closeBtn = await page.$('.close-btn').catch(() => null)
    if (closeBtn) {
      await closeBtn.click()
      console.log(`[Bot ${botId}] Closed modal`)
    }

    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500))
    return true
  } catch (error) {
    console.error(`[Bot ${botId}] Error closing modal:`, error.message)
    return false
  }
}

/**
 * Simulates user waiting and refreshing
 */
async function waitAndRefresh(page, botId) {
  try {
    const waitTime = Math.random() * 5000 + 2000
    console.log(`[Bot ${botId}] Waiting ${Math.round(waitTime / 1000)}s before refresh...`)

    await new Promise(resolve => setTimeout(resolve, waitTime))

    console.log(`[Bot ${botId}] Refreshing page...`)
    await page.reload({ waitUntil: 'networkidle2' })

    return true
  } catch (error) {
    console.error(`[Bot ${botId}] Error during wait and refresh:`, error.message)
    return false
  }
}

/**
 * Simulates a user session
 */
async function runBotSession(botId) {
  const session = await createBotSession(botId)
  if (!session) return

  const { browser, page } = session
  const sessionStartTime = Date.now()
  let actionCount = 0

  try {
    // Initial product view
    await viewProducts(page, botId)

    // Simulate user actions for the session duration
    while (Date.now() - sessionStartTime < CONFIG.sessionDuration) {
      const action = actions[Math.floor(Math.random() * actions.length)]

      console.log(`[Bot ${botId}] Executing action: ${action}`)

      switch (action) {
        case 'viewProducts':
          await viewProducts(page, botId)
          break
        case 'viewInventory':
          await viewInventory(page, botId)
          await closeModalAndWait(page, botId)
          break
        case 'scrollPage':
          await scrollPage(page, botId)
          break
        case 'waitAndRefresh':
          await waitAndRefresh(page, botId)
          break
        case 'viewDetails':
          await viewInventory(page, botId)
          await closeModalAndWait(page, botId)
          break
      }

      actionCount++

      // Wait before next action
      await new Promise(resolve => setTimeout(resolve, CONFIG.botInterval))
    }

    console.log(`[Bot ${botId}] Session completed. Total actions: ${actionCount}`)
  } catch (error) {
    console.error(`[Bot ${botId}] Session error:`, error.message)
  } finally {
    try {
      await browser.close()
      console.log(`[Bot ${botId}] Browser closed`)
    } catch (error) {
      console.error(`[Bot ${botId}] Error closing browser:`, error.message)
    }
  }
}

/**
 * Simulates GraphQL queries directly
 */
async function runGraphQLBot(botId) {
  const sessionStartTime = Date.now()
  let queryCount = 0

  const query = `
    query {
      products {
        id
        name
        price
        inStock
        inventory {
          quantity
          warehouse
          estimatedDelivery
        }
      }
    }
  `

  console.log(`[GraphQL Bot ${botId}] Starting GraphQL query simulation...`)

  while (Date.now() - sessionStartTime < CONFIG.sessionDuration) {
    const result = await makeGraphQLQuery(query)
    if (result && result.data) {
      queryCount++
      console.log(`[GraphQL Bot ${botId}] Query ${queryCount} successful`)
    } else {
      console.log(`[GraphQL Bot ${botId}] Query ${queryCount} failed`)
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.botInterval))
  }

  console.log(`[GraphQL Bot ${botId}] Completed. Total queries: ${queryCount}`)
}

/**
 * Main bot orchestrator
 */
async function main() {
  console.log('🤖 Willful Waste Bot - Traffic Generator')
  console.log(`📝 Configuration:`)
  console.log(`   Website URL: ${CONFIG.websiteUrl}`)
  console.log(`   GraphQL URL: ${CONFIG.graphqlUrl}`)
  console.log(`   Concurrent Bots: ${CONFIG.concurrentBots}`)
  console.log(`   Session Duration: ${CONFIG.sessionDuration / 1000}s`)
  console.log(`   Action Interval: ${CONFIG.botInterval}ms`)
  console.log('')

  // Start concurrent bot sessions
  const botPromises = []

  // Start browser-based bots
  for (let i = 1; i <= CONFIG.concurrentBots; i++) {
    botPromises.push(runBotSession(i))
  }

  // Start GraphQL-based bots (lighter weight)
  for (let i = 1; i <= Math.ceil(CONFIG.concurrentBots / 2); i++) {
    botPromises.push(runGraphQLBot(CONFIG.concurrentBots + i))
  }

  console.log(`⏱️  Bots started. Waiting for sessions to complete...`)
  console.log(`⏹️  Press Ctrl+C to stop.`)
  console.log('')

  try {
    await Promise.all(botPromises)
    console.log('\n✅ All bot sessions completed')
  } catch (error) {
    console.error('Fatal error:', error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down bot...')
  process.exit(0)
})

// Start the bot
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
