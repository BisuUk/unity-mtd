#pragma strict

var unitPrefab : Transform;
var playerObject : GameObject;
var emitPosition : Transform;
private var playerData : PlayerData;


function Start ()
{
   if (playerObject)
      playerData = playerObject.GetComponent(PlayerData);
}

function Update ()
{
   // On rate interval
      // Check queue contents
      // Launch unit of squad type
      // if top squad count = 0
        // pop squad off queue
}

function OnMouseDown()
{
   if (playerData.selectedSquadID > -1)
   {
      var newUnitT : Transform;
      newUnitT = Instantiate(unitPrefab, emitPosition.position, Quaternion.identity);
      var newUnit : Unit = newUnitT.gameObject.GetComponent(Unit);
      newUnit.SetAttributes(playerData.selectedSquad());
      renderer.material.color = Color.green;
   }
}

function OnMouseEnter()
{
   renderer.material.color = Color.red;
   //Debug.Log("ONMOUSEENTER");
}

function OnMouseExit()
{
   renderer.material.color = Color.white;
}