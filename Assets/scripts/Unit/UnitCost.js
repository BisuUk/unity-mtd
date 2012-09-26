#pragma strict


enum CostGrowth
{
   LINEAR,
   EXPONENTIAL
}

class UnitCostStruct
{
   var costLimits : Vector2;
   var costGrowth : CostGrowth;
}

var units : UnitCostStruct[];



//var colorTimeCostBase : float;
//var colorTimeCostExp : float;

function Cost(type : int, strength : float) : int
{
   if (type >= units.Length)
   {
      Debug.LogError("UnitCost not defined!");
      return;
   }

   var c : UnitCostStruct;
   var cost : float = 0;

   c = units[type];


   if (c.costGrowth==CostGrowth.LINEAR)
      cost = Mathf.Lerp(c.costLimits.x, c.costLimits.y, strength);
   else
      cost = c.costLimits.x * Mathf.Pow((c.costLimits.y / c.costLimits.x), strength);

   return Mathf.RoundToInt(cost);
}
/*
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
*/
