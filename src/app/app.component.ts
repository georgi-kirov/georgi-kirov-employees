import { Component } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  fileContent: object = {};
  fileContentData: boolean = false;

  public onChange(fileList: FileList): void {
    let file = fileList[0];
    let fileReader: FileReader = new FileReader();
    let self = this;
    fileReader.onloadend = function(x) {
      self.start(fileReader.result);
    }
    fileReader.readAsText(file);
  }

  private start(initialFileContent) {
    this.fileContent = {};
    this.fileContentData = false;
    let lines = initialFileContent.trim().split('\n');
    let employees = []
    let self = this;

    for (var i = 0; i < lines.length; i++) {
     
      let line = lines[i].trim().split(",")
      let employee = {
        empID: Number(line[0]),
        projectID: Number(line[1]),
        dateFrom: moment.utc(line[2]),
        dateTo: (line[3] === 'NULL') ? moment.utc() : moment.utc(line[3])
      }
      employees.push(employee)
    }
    
    let endResult = this.getCommongWorkingDays(employees)

    if(endResult['mostTimeWorkTogether'].totalDays !== 0) {
      self.fileContent = endResult['mostTimeWorkTogether'];
      self.fileContentData = true;
    } else  {
      self.fileContent['message'] = 'Incorrect file content!';
    }
    
    
  }

  private maxDate(firstDate, secondDate) {
    return firstDate > secondDate ? firstDate : secondDate;
  }
  
  private minDate(firstDate, secondDate) {
    return firstDate < secondDate ? firstDate : secondDate;
  }

  private getCommongWorkingDays(employees) {
    let dateRangesByEmployeesIDs = {};
    let result = {
      mostTimeWorkTogether: {
        employeeOne: null,
        employeeTwo: null,
        projectId: null,
        totalDays: 0
      },
      pairs: []
    }
  
    for (let employee of employees) {
      for (let otherEmployee of employees) {
        // if its the same employee or the project is different continue
        if (employee.empID === otherEmployee.empID || employee.projectID !== otherEmployee.projectID) continue;
        
        let projectId = employee.projectID;
        let maxFrom = moment.utc(this.maxDate(employee.dateFrom, otherEmployee.dateFrom))
        let minTo = moment.utc(this.minDate(employee.dateTo, otherEmployee.dateTo))
      
        // if there is no intersection continue
        if (!(maxFrom < minTo)) continue;
  
        let compoundKey = `${Math.min(Number(employee.empID), Number(otherEmployee.empID))}-${Math.max(Number(employee.empID), Number(otherEmployee.empID))}`
  
        dateRangesByEmployeesIDs[compoundKey] = dateRangesByEmployeesIDs[compoundKey] || []

        let dateRanges = dateRangesByEmployeesIDs[compoundKey]
        for (let range of dateRanges) {
          let maxFromValidRange = moment.utc(this.maxDate(maxFrom, range.dateFrom))
          let minToValidRange = moment.utc(this.minDate(minTo, range.dateTo))
  
          if (!(maxFromValidRange < minToValidRange)) continue;
  
          if (maxFrom < range.dateFrom && minTo < range.dateTo) {
            // date are on the left
            minTo = moment.utc(range.dateFrom)
          } else if (maxFrom > range.dateFrom && minTo > range.dateTo) {
            // date are on the right
            maxFrom = moment.utc(range.dateTo)
          } else if (maxFrom < range.dateFrom && minTo > range.dateTo) {
            // date is between range
            range.dateTo = moment.utc(minTo)
            maxFrom = moment.utc(range.dateFrom)
          } else if (maxFrom >= range.dateFrom && minTo <= range.dateTo) {
            // date is in another range
            maxFrom = null
            minTo = null
            break;
          }
        }
        // if there is no valid intersection continue
        if (!(maxFrom < minTo)) continue;
  
        dateRanges.push({ dateFrom: maxFrom, dateTo: minTo , projectId: projectId})
      }
    }
  
    for (let employeesIDs in dateRangesByEmployeesIDs) {

      if (!dateRangesByEmployeesIDs.hasOwnProperty(employeesIDs)) continue;
  
      let ranges = dateRangesByEmployeesIDs[employeesIDs]
      let days = 0
      let projectId = 0;

      for (let range of ranges) {
        projectId = range.projectId;
        days += Math.abs((range.dateFrom.valueOf() - range.dateTo.valueOf()) / (86400000));
      }

      let ids = employeesIDs.split('-')
      let newPair = {
        employeeOne: ids[0],
        employeeTwo: ids[1],
        projectId: projectId,
        totalDays: days
      }
      result.pairs.push(newPair)
  
      if (newPair.totalDays > result.mostTimeWorkTogether.totalDays) {
        result.mostTimeWorkTogether = newPair
      }
    }
    return result
  }
}
