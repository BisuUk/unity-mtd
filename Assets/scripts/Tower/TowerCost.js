#pragma strict

var baseCost : float;
var rangeCostBase : float;
var rangeCostExp : float;
var fovCostBase : float;
var fovCostExp : float;
var strengthCostBase : float;
var strengthCostExp : float;
var fireRateCostBase : float;
var fireRateCostExp : float;
var colorCostBase : float;
var colorCostExp : float;
var baseTimeCost : float;
var rangeTimeCostBase : float;
var rangeTimeCostExp : float;
var fovTimeCostBase : float;
var fovTimeCostExp : float;
var strengthTimeCostBase : float;
var strengthTimeCostExp : float;
var fireRateTimeCostBase : float;
var fireRateTimeCostExp : float;
var colorTimeCostBase : float;
var colorTimeCostExp : float;

// All float values should be normalized (0.0 - 1.0)
function Cost(range : float, fov : float, fireRate : float, strength : float, effect : int) : int
{
   return Mathf.FloorToInt(baseCost
      + Mathf.Pow(rangeCostBase*range, rangeCostExp)
      + Mathf.Pow(fovCostBase*fov, fovCostExp)
      + Mathf.Pow(fireRateCostBase*fireRate, fireRateCostExp)
      + Mathf.Pow(strengthCostBase*strength, strengthCostExp));
}

function ColorDiffCost(from : Color, to : Color) : int
{
   var diff : float = (1.0-Utility.ColorMatch(from, to));
   return Mathf.FloorToInt(Mathf.Pow(colorCostBase*diff, colorCostExp));
}

// All float values should be normalized (0.0 - 1.0)
function TimeCost(range : float, fov : float, fireRate : float, strength : float, effect : int) : float
{
   return baseTimeCost
      + Mathf.Pow(rangeTimeCostBase*range, rangeTimeCostExp)
      + Mathf.Pow(fovTimeCostBase*fov, fovTimeCostExp)
      + Mathf.Pow(fireRateTimeCostBase*fireRate, rangeTimeCostExp)
      + Mathf.Pow(strengthTimeCostBase*strength, strengthTimeCostExp);
}

function ColorDiffTimeCost(from : Color, to : Color) : float
{
   var diff : float = (1.0-Utility.ColorMatch(from, to));
   return Mathf.Pow(colorTimeCostBase*diff, colorTimeCostExp);
}
