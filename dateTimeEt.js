const weekdayNamesEt = ["pühapäev", "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev"];
const monthNamesEt = ["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni", "juuli", "august", "september", "oktoober", "november", "detsember"];

const dateFormatted = function(){
	let timeNow = new Date();
	let dateNow = timeNow.getDate();
	let monthNow = timeNow.getMonth();
	let yearNow = timeNow.getFullYear();
	return dateNow + ". " + monthNamesEt[monthNow] + " " + yearNow;
}

const givenDateFormatted = function(givenDate) {
  let date = new Date(givenDate);
  let dayThen = date.getDate();
  let monthThen = date.getMonth();
  let yearThen = date.getFullYear();
  console.log(dayThen + ". " + monthNamesEt[monthThen] + " " + yearThen)
  return dayThen + ". " + monthNamesEt[monthThen] + " " + yearThen;
}

const weekDay = function(){
	let timeNow = new Date();
	let dayNow = timeNow.getDay();
	return weekdayNamesEt[dayNow];
}

const timeFormatted = function(){
	let timeNow = new Date();
	let hourNow = timeNow.getHours();
	let minuteNow = timeNow.getMinutes();
	let secondNow = timeNow.getSeconds();
	return hourNow + ":" + minuteNow + ":" + secondNow;
}

const partOfDay = function(){
	let dPart = "suvaline aeg";
	let hourNow = new Date().getHours();
	//   OR   ||   AND  &&
	// >   <    >=  <=    !=   ==    ===
	if(hourNow > 8 && hourNow <= 16){
		dPart = "kooliaeg";
	}
	return dPart;
}

const semesterTimeNow = function(){
  let timeNow = new Date();
  let dateNow = timeNow.getTime();
  let startDate = new Date("09/02/2024");
  let timeFromStart = dateNow - startDate.getTime();
  let endDate = new Date("01/26/2025");
  let timeUntilEnd = endDate.getTime() - dateNow;
  let differenceFromStart = Math.round(timeFromStart / (1000 * 3600 * 24));
  let differenceUntilEnd = Math.round(timeUntilEnd / (1000 * 3600 * 24));
  return "Semestri algusest möödas: " + differenceFromStart + " päeva ja lõpuni: " + differenceUntilEnd + " päeva";
}

//ekspordin kõik vajaliku
module.exports = {dateFormatted: dateFormatted, weekDay: weekDay, timeFormatted: timeFormatted, weekdayNames: weekdayNamesEt, monthNames: monthNamesEt, dayPart: partOfDay, givenDateFormatted: givenDateFormatted, semesterTimeNow: semesterTimeNow};
