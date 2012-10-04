#pragma strict

enum CostGrowth
{
   LINEAR,
   EXPONENTIAL
}

class CostStruct
{
   var costLimits : Vector2;
   var costGrowth : CostGrowth;
}


class TowerStruct
{
   var attributeCost : CostStruct[];

   function TotalCost(strength : float, rate : float, range : float) : int
   {
      var returnValue : int;
      returnValue += AttributeCost(AttributeType.STRENGTH, strength);
      returnValue += AttributeCost(AttributeType.FIRERATE, rate);
      returnValue += AttributeCost(AttributeType.RANGE, range);
      return returnValue;
   }

   function AttributeCost(type : AttributeType, val : float) : int
   {
      if (type < 0 || type >= attributeCost.Length)
      {
         Debug.LogError("ERROR: Cost not defined for tower attribute "+type+"!");
         return 0;
      }
      var c : CostStruct = attributeCost[type];
      var cost : float = 0;

      if (c.costGrowth==CostGrowth.LINEAR)
         cost = Mathf.Lerp(c.costLimits.x, c.costLimits.y, val);
      else
         cost = c.costLimits.x * Mathf.Pow((c.costLimits.y / c.costLimits.x), val);
      return Mathf.RoundToInt(cost);
   }
}

var unit : CostStruct[];
var ability : int[];
var tower : TowerStruct[];
var towerTime : CostStruct[];


function Unit(type : int, strength : float) : int
{
   if (type < 0 || type >= unit.Length)
   {
      Debug.LogError("ERROR: Cost not defined for unit type "+type+"!");
      return 0;
   }

   var c : CostStruct;
   var cost : float = 0;

   c = unit[type];

   if (c.costGrowth==CostGrowth.LINEAR)
      cost = Mathf.Lerp(c.costLimits.x, c.costLimits.y, strength);
   else
      cost = c.costLimits.x * Mathf.Pow((c.costLimits.y / c.costLimits.x), strength);

   return Mathf.RoundToInt(cost);
}

function Ability(type : int) : int
{
   if (type < 0 || type >= ability.Length)
   {
      Debug.LogError("ERROR: Cost not defined for ability type "+type+"!");
      return 0;
   }
   return ability[type];
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
