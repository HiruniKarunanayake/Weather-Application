import React, { useState } from 'react'
import './Weather.css'
import clearIcon from '../assets/sun.png'
import cloudyIcon from '../assets/cloudy.png'
import rainyIcon from '../assets/rainy-day.png'
import snowIcon from '../assets/snow.png'
import stormIcon from '../assets/storm.png'
import downpourIcon from '../assets/downpour.png'
import atmosphericIcon from '../assets/atmospheric-conditions.png'

// Uses Vite env variable VITE_OPENWEATHER_API_KEY (create .env at project root)
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || ''

// Get weather icon based on temperature and weather conditions
const getWeatherIcon = (weatherData, currentUnit) => {
  if (!weatherData || !weatherData.weather || !weatherData.weather[0]) {
    return cloudyIcon
  }

  const temp = weatherData.main.temp
  const conditionId = weatherData.weather[0].id

  console.log('Temperature:', temp, currentUnit === 'metric' ? '°C' : '°F', 'Condition ID:', conditionId, 'Condition:', weatherData.weather[0].main)

  // HIGHEST PRIORITY: Severe weather conditions override temperature
  
  // Thunderstorm (200-232)
  if (conditionId >= 200 && conditionId < 300) {
    return stormIcon
  }
  
  // Rain (300-531)
  if ((conditionId >= 300 && conditionId < 400) || (conditionId >= 500 && conditionId < 600)) {
    if (conditionId === 502 || conditionId === 503 || conditionId === 504 || conditionId === 522) {
      return downpourIcon // Heavy rain
    }
    return rainyIcon
  }
  
  // Snow (600-622)
  if (conditionId >= 600 && conditionId < 700) {
    return snowIcon
  }
  
  // Fog/Mist/Haze (700-781)
  if (conditionId >= 700 && conditionId < 800) {
    return atmosphericIcon
  }

  // TEMPERATURE-BASED LOGIC (adjusts for Celsius vs Fahrenheit)
  // Define thresholds based on unit
  const freezing = currentUnit === 'metric' ? 0 : 32
  const cold = currentUnit === 'metric' ? 10 : 50
  const cool = currentUnit === 'metric' ? 15 : 59
  const warm = currentUnit === 'metric' ? 25 : 77
  
  // Below freezing - Snow
  if (temp < freezing) {
    return snowIcon
  }
  
  // Cold - Cloudy
  if (temp < cold) {
    return cloudyIcon
  }
  
  // Cool - Cloudy
  if (temp < cool) {
    return cloudyIcon
  }
  
  // Mild - Check actual weather condition
  if (temp < warm) {
    // Clear sky
    if (conditionId === 800) {
      return clearIcon
    }
    // Cloudy
    return cloudyIcon
  }
  
  // Warm to Hot - Sun
  return clearIcon
}

const Weather = () => {
  const [query, setQuery] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchTime, setFetchTime] = useState(null)
  const [unit, setUnit] = useState('metric') // 'metric' for Celsius, 'imperial' for Fahrenheit

  const fetchWeatherWithUnit = async (city, specificUnit) => {
    if (!API_KEY) {
      setError('No API key found. Add VITE_OPENWEATHER_API_KEY to .env')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&appid=${API_KEY}&units=${specificUnit}`
      
      console.log('Fetching weather for:', city, 'in unit:', specificUnit)
      console.log('API Key present:', API_KEY ? 'Yes' : 'No')
      
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.log('API Error Response:', errorData)
        
        if (res.status === 401) {
          throw new Error('API key invalid or not activated yet. Wait 10-15 minutes after signup, then try again.')
        }
        if (res.status === 404) {
          throw new Error('City not found. Please check the spelling and try again.')
        }
        if (res.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.')
        }
        
        // Handle OpenWeatherMap specific error codes
        if (errorData.cod === 500000 || errorData.message?.includes('500000')) {
          throw new Error('OpenWeatherMap service error. This usually means:\n1. Your API key needs to be activated (wait 15-30 min)\n2. Your account needs email verification\n3. Try generating a new API key at: https://home.openweathermap.org/api_keys')
        }
        
        throw new Error(errorData.message || `Error: ${res.status} - ${res.statusText}`)
      }
      const json = await res.json()
      
      // Check if we got valid data
      if (!json || !json.main || !json.weather) {
        throw new Error('Invalid response from weather API')
      }
      
      setData(json)
      setFetchTime(new Date())
    } catch (err) {
      console.error('Weather fetch error:', err)
      setError(err.message || 'Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeather = async (city) => {
    fetchWeatherWithUnit(city, unit)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!query) return
    fetchWeather(query)
  }

  const toggleUnit = () => {
    const newUnit = unit === 'metric' ? 'imperial' : 'metric'
    setUnit(newUnit)
    if (data && query) {
      // Re-fetch with new unit immediately
      fetchWeatherWithUnit(query, newUnit)
    }
  }

  const getUnitSymbol = () => unit === 'metric' ? '°C' : '°F'

  // Geolocation feature
  const getCurrentLocationWeather = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoading(true)
    setError('')
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`
          
          console.log('Fetching weather for current location in unit:', unit)
          
          const res = await fetch(url)
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.message || `Error: ${res.status}`)
          }
          
          const json = await res.json()
          
          if (!json || !json.main || !json.weather) {
            throw new Error('Invalid response from weather API')
          }
          
          setData(json)
          setFetchTime(new Date())
          setQuery(json.name) // Update search box with city name
        } catch (err) {
          console.error('Geolocation weather fetch error:', err)
          setError(err.message || 'Failed to fetch weather for your location')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setLoading(false)
        setError('Unable to get your location. Please enable location access.')
      }
    )
  }

  return (
    <div className="weather">
      <div className="weather-header">
        <h1>Weather Forecast</h1>
        <div className="header-actions">
          <button onClick={getCurrentLocationWeather} className="location-btn" title="Get current location weather">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
            </svg>
            My Location
          </button>
          <button onClick={toggleUnit} className="unit-toggle-btn" title="Toggle temperature unit">
            {unit === 'metric' ? '°F' : '°C'}
          </button>
        </div>
      </div>

      <form className="search-bar" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Search for a city..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-btn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </form>

      {loading && <p className="loading">Loading…</p>}
      {error && (
        <div className="error">
          <p><strong>Error:</strong> {error}</p>
          <p style={{fontSize: '12px', marginTop: '10px'}}>
            Check browser console (F12) for more details
          </p>
        </div>
      )}

      {data && (
        <div className="result">
          <div className="main-weather-display">
            <div className="location">
              <h2>
                {data.name}, {data.sys?.country}
              </h2>
              {fetchTime && (
                <p className="current-time">
                  {fetchTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {' • '}
                  {fetchTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              )}
            </div>

            <div className="weather-center">
              <div className="weather-icon">
                <img
                  src={getWeatherIcon(data, unit)}
                  alt={data.weather?.[0]?.description || 'weather icon'}
                />
              </div>
              
              <div className="temperature">
                <p className="temp">{Math.round(data.main.temp)}{getUnitSymbol()}</p>
                <p className="desc">{data.weather?.[0]?.description}</p>
              </div>
            </div>
          </div>

          <div className="weather-details">
            <div className="detail-item">
              <span className="detail-label">Feels like</span>
              <span className="detail-value">{Math.round(data.main.feels_like)}{getUnitSymbol()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{data.main.humidity}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Wind Speed</span>
              <span className="detail-value">{data.wind.speed} {unit === 'metric' ? 'm/s' : 'mph'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Pressure</span>
              <span className="detail-value">{data.main.pressure} hPa</span>
            </div>
            {data.visibility && (
              <div className="detail-item">
                <span className="detail-label">Visibility</span>
                <span className="detail-value">{(data.visibility / 1000).toFixed(1)} km</span>
              </div>
            )}
            {data.sys?.sunrise && (
              <div className="detail-item">
                <span className="detail-label">Sunrise</span>
                <span className="detail-value">
                  {new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
            {data.sys?.sunset && (
              <div className="detail-item">
                <span className="detail-label">Sunset</span>
                <span className="detail-value">
                  {new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
            {data.clouds && (
              <div className="detail-item">
                <span className="detail-label">Cloudiness</span>
                <span className="detail-value">{data.clouds.all}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Weather
