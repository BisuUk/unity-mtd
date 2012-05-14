#pragma strict

var baseCost : float;
var sizeCostBase : float;
var sizeCostExp : float;
var strengthCostBase : float;
var strengthCostExp : float;
var colorCostBase : float;
var colorCostExp : float;
var baseTimeCost : float;
var sizeTimeCostBase : float;
var sizeTimeCostExp : float;
var strengthTimeCostBase : float;
var strengthTimeCostExp : float;
var colorTimeCostBase : float;
var colorTimeCostExp : float;

function Cost(size : float, strength : float) : int
{
   return Mathf.FloorToInt( baseCost
      + Mathf.Pow(sizeCostBase*size, sizeCostExp)
      + Mathf.Pow(strengthCostBase*strength, strengthCostExp) );
}

function ColorDiffCost(from : Color, to : Color) : int
{
   var diff : float = (1.0-Utility.ColorMatch(from, to));
   return Mathf.FloorToInt(Mathf.Pow(colorCostBase*diff, colorCostExp));
}

function TimeCost(size : float, strength : float) : float
{
   //Debug.Log("baseTimeCost="+baseTimeCost+" sz="+Mathf.Pow(sizeTimeCostBase*size, sizeTimeCostExp));
   return ( baseTimeCost
      + Mathf.Pow(sizeTimeCostBase*size, sizeTimeCostExp)
      + Mathf.Pow(strengthTimeCostBase*strength, strengthTimeCostExp) );
}

function ColorDiffTimeCost(from : Color, to : Color) : float
{
   var diff : float = (1.0-Utility.ColorMatch(from, to));
   return Mathf.Pow(colorTimeCostBase*diff, colorTimeCostExp);
}
