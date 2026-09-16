// OpenWeatherMap API 키 (무료 API 키 사용)
// https://openweathermap.org/api 에서 무료 API 키를 받을 수 있습니다
const API_KEY = 'YOUR_API_KEY_HERE'; // 여기에 API 키를 입력하세요
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 전역 변수
let favorites = JSON.parse(localStorage.getItem('favoritesCities')) || [];
let currentWeather = null;

// 초기화
window.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
});

// 날씨 아이콘 매핑
const weatherIcons = {
    '01d': '☀️', '01n': '🌙',
    '02d': '🌤️', '02n': '🌥️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

// 엔터키 검색
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        searchWeather();
    }
}

// 도시 검색
function searchWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) {
        showError('도시명을 입력하세요.');
        return;
    }
    fetchWeatherByCity(city);
}

// 현재 위치 가져오기
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoader();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoordinates(latitude, longitude);
            },
            (error) => {
                hideLoader();
                showError('위치 정보를 가져올 수 없습니다.');
                console.error(error);
            }
        );
    } else {
        showError('이 브라우저는 위치 정보를 지원하지 않습니다.');
    }
}

// 도시명으로 날씨 가져오기
function fetchWeatherByCity(city) {
    showLoader();
    hideError();

    const currentWeatherUrl = `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ko`;
    const forecastUrl = `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=ko`;

    Promise.all([
        fetch(currentWeatherUrl),
        fetch(forecastUrl)
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([weatherData, forecastData]) => {
        if (weatherData.cod !== 200) {
            throw new Error(weatherData.message);
        }
        hideLoader();
        currentWeather = weatherData;
        displayWeather(weatherData);
        displayForecast(forecastData);
    })
    .catch(error => {
        hideLoader();
        showError('날씨 정보를 가져올 수 없습니다. API 키를 확인하세요.');
        console.error('Error:', error);
    });
}

// 좌표로 날씨 가져오기
function fetchWeatherByCoordinates(lat, lon) {
    showLoader();
    hideError();

    const currentWeatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ko`;
    const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ko`;

    Promise.all([
        fetch(currentWeatherUrl),
        fetch(forecastUrl)
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([weatherData, forecastData]) => {
        hideLoader();
        currentWeather = weatherData;
        displayWeather(weatherData);
        displayForecast(forecastData);
    })
    .catch(error => {
        hideLoader();
        showError('날씨 정보를 가져올 수 없습니다.');
        console.error('Error:', error);
    });
}

// 날씨 정보 표시
function displayWeather(data) {
    const mainWeatherDiv = document.getElementById('mainWeather');
    mainWeatherDiv.classList.remove('hidden');

    // 도시 정보
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ko-KR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // 날씨 아이콘 및 온도
    const iconCode = data.weather[0].icon;
    document.getElementById('weatherIconLarge').textContent = weatherIcons[iconCode] || '🌤️';
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;

    // 상세 정보
    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
    document.getElementById('cloudiness').textContent = `${data.clouds.all}%`;
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;

    // 일출/일몰
    const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sunTimes').textContent = `일출: ${sunrise} / 일몰: ${sunset}`;

    // 강수량
    const rain = data.rain ? `${data.rain['1h']} mm` : '강수 없음';
    document.getElementById('rainfall').textContent = rain;

    // 온도 범위
    document.getElementById('tempRange').textContent = `최고: ${Math.round(data.main.temp_max)}°C / 최저: ${Math.round(data.main.temp_min)}°C`;

    document.getElementById('cityInput').value = '';
}

// 5일 예보 표시
function displayForecast(data) {
    const forecastDiv = document.getElementById('forecast');
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    // 하루에 한 번씩 표시 (12:00 시간 기준)
    const dailyForecasts = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('ko-KR');
        const hour = new Date(item.dt * 1000).getHours();
        
        // 정오에 가까운 데이터만 선택 (9시~15시 범위)
        if ((hour >= 9 && hour <= 15) && !dailyForecasts[date]) {
            dailyForecasts[date] = item;
        }
    });

    // 최대 5일만 표시
    Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
        const iconCode = forecast.weather[0].icon;
        const date = new Date(forecast.dt * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-date">${date}</div>
            <div class="forecast-icon">${weatherIcons[iconCode] || '🌤️'}</div>
            <div class="forecast-temp">${Math.round(forecast.main.temp)}°C</div>
            <div class="forecast-description">${forecast.weather[0].description}</div>
        `;
        forecastContainer.appendChild(forecastItem);
    });

    forecastDiv.classList.remove('hidden');
}

// 즐겨찾기 도시 로드
function loadFavorites() {
    displayFavorites();
}

// 즐겨찾기 표시
function displayFavorites() {
    const list = document.getElementById('favoritesList');
    list.innerHTML = '';

    if (favorites.length === 0) {
        list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">즐겨찾기 도시가 없습니다.</p>';
        return;
    }

    favorites.forEach(city => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.innerHTML = `
            <button class="remove-favorite" onclick="removeFavorite('${city}')">✕</button>
            <h4>${city}</h4>
            <div class="favorite-temp">로드 중...</div>
        `;
        list.appendChild(item);

        // 각 도시의 날씨 정보 가져오기
        fetchFavoriteCityWeather(city, item);
    });
}

// 즐겨찾기 도시의 날씨 정보 가져오기
function fetchFavoriteCityWeather(city, element) {
    const url = `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ko`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.cod === 200) {
                element.querySelector('.favorite-temp').textContent = `${Math.round(data.main.temp)}°C`;
                element.onclick = () => {
                    document.getElementById('cityInput').value = city;
                    searchWeather();
                };
            }
        })
        .catch(error => console.error('Error:', error));
}

// 즐겨찾기 추가 토글
function toggleAddFavorite() {
    const form = document.getElementById('addFavoriteForm');
    form.classList.toggle('hidden');
}

// 즐겨찾기 추가
function addFavorite() {
    const input = document.getElementById('favoriteCityInput');
    const city = input.value.trim();

    if (!city) {
        showError('도시명을 입력하세요.');
        return;
    }

    if (favorites.includes(city)) {
        showError('이미 즐겨찾기에 추가된 도시입니다.');
        return;
    }

    favorites.push(city);
    localStorage.setItem('favoritesCities', JSON.stringify(favorites));
    input.value = '';
    toggleAddFavorite();
    displayFavorites();
}

// 즐겨찾기 제거
function removeFavorite(city) {
    favorites = favorites.filter(c => c !== city);
    localStorage.setItem('favoritesCities', JSON.stringify(favorites));
    displayFavorites();
}

// UI 함수들
function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}