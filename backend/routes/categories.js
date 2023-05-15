const Category = require('../models/Category');
const express = require('express');
const categoryRouter = express.Router();

categoryRouter.get('/', async (req, res) => {
    const categoryList = await Category.find();

    if (!categoryList) {
        res.status(500).json({ succes: false })
    }
    res.status(200).send(categoryList);
})

categoryRouter.get('/:id', async(req,res)=>{
    const category = await Category.findById(req.params.id);

    if(!category){
        res.status(500).json({message: 'The category with the given ID was not found.'})
    }
    res.status(200).send(category);
})

categoryRouter.post('/', async (req, res) => {
    let category = new Category({
        name: req.body.name,
        // image: req.body.image
    });
    category = await category.save();

    if (!category)
        return res.status(400).send('the category cannot be created!')

    res.send(category);
})

categoryRouter.put('/:id', async (req, res)=> {
    const category = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            // image: req.body.image
        },
        {new: true}
    )
    if (!category)
        return res.status(400).send('the category cannot be created!')

    res.send(category);
})


categoryRouter.delete('/:id', (req, res) => {
    Category.findByIdAndRemove(req.params.id)
        .then(Category => {
            if(Category) {
                return res.status(200).json({success: true, message: 'the category is deleted!'})
            } else{
                return res.status(404).json({success: false, message: "category not found!"})
            }
    }).catch(err=>{
        return res(400).json({success: false, error: err})
    })
})

module.exports = categoryRouter;