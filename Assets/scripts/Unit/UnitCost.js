#pragma strict

var baseCost : float;
var baseTimeCost : float;

var sizeCostBase : float;
var sizeTimeCostBase : float;
var sizeCostExp : float;
var sizeTimeCostExp : float;

var strengthCostBase : float;
var strengthCostExp : float;
var strengthTimeCostBase : float;
var strengthTimeCostExp : float;

var colorCostBase : float;
var colorCostExp : float;
var colorTimeCostBase : float;
var colorTimeCostExp : float;



function Cost(unitType : int, size : float, strength : float) : int
{
   return Mathf.CeilToInt( baseCost
      + Mathf.Pow(sizeCostBase, sizeCostExp)
      + Mathf.Pow(strengthCostBase, strengthCostExp) );
}

function TimeCost(unitType : int, size : float, strength : float) : int
{
   return Mathf.CeilToInt( baseCost
      + Mathf.Pow(sizeTimeCostBase, sizeTimeCostExp)
      + Mathf.Pow(strengthTimeCostBase, strengthTimeCostExp) );
}

function ColorDiffCost(from : Color, to : Color) : int
{

}

function ColorDiffTimeCost(from : Color, to : Color) : int
{

}